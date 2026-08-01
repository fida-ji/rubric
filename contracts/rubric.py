# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# Rubric - trustless escrow for creative work, settled by a decentralized AI panel.
#
# A client funds an escrow that names a freelancer, a brief, and acceptance
# criteria (a rubric). The freelancer delivers the work as text. When the work is
# submitted, GenLayer validators each read the brief, the criteria, and the
# deliverable, independently grade the deliverable against the rubric, and reach
# consensus on a single bounded verdict: "accept", "partial", or "reject".
#
# The verdict deterministically settles the money:
#   accept  -> freelancer is paid the deposit minus the protocol fee.
#   partial -> freelancer is paid a fixed share minus fee; the client is refunded the rest.
#   reject  -> the client is refunded in full (no fee is charged on rejected work).
#
# The consensus-critical decision owned by this contract is the subjective grade:
#   "Does this deliverable meet the client's brief and acceptance criteria?"
# It cannot be reduced to a deterministic API call, and letting either party or a
# single centralized model decide would be a conflict of interest. Everything that
# moves money is deterministic and runs only after validators agree on the verdict.

from genlayer import *

import json
import typing
from dataclasses import dataclass
from datetime import datetime, timezone

# --- Error classification (compared by validators to decide agreement) --------
ERROR_EXPECTED = "[EXPECTED]"  # business-logic error, deterministic, must match exactly
ERROR_LLM = "[LLM_ERROR]"      # malformed model output, disagree to force leader rotation

# --- Job lifecycle states (stored as plain strings, never enums) --------------
STATUS_OPEN = "OPEN"                # funded, awaiting the freelancer's deliverable
STATUS_SUBMITTED = "SUBMITTED"      # deliverable in, awaiting adjudication
STATUS_ACCEPTED = "ACCEPTED"        # panel accepted; freelancer paid in full (minus fee)
STATUS_PARTIAL = "PARTIAL"          # panel accepted with issues; payment split
STATUS_REJECTED = "REJECTED"        # panel rejected; client refunded in full
STATUS_CANCELLED = "CANCELLED"      # client cancelled before submission; client refunded

# --- The bounded consensus decision field -------------------------------------
VERDICT_ACCEPT = "accept"
VERDICT_PARTIAL = "partial"
VERDICT_REJECT = "reject"
VALID_VERDICTS = (VERDICT_ACCEPT, VERDICT_PARTIAL, VERDICT_REJECT)

# --- Economic constants (basis points, 10000 = 100%) --------------------------
BPS_DENOMINATOR = 10000
MAX_FEE_BPS = 1000       # protocol fee capped at 10%
PARTIAL_BPS = 6000       # on a "partial" verdict the freelancer receives 60% of the deposit
SECONDS_PER_DAY = 86400


@allow_storage
@dataclass
class Job:
    id: u256
    client: Address          # funds the escrow, owns the brief
    freelancer: Address      # the only address allowed to submit the deliverable
    title: str
    category: str            # e.g. "copywriting", "code", "article"
    brief: str               # what the client asked for
    criteria: str            # acceptance criteria the panel grades against (the rubric)
    deposit: u256            # escrowed payment, in wei (1 GEN = 1e18 wei)
    created_at: u256         # unix seconds
    deadline: u256           # unix seconds
    status: str
    deliverable: str         # submitted work (plain text); "" until submitted
    deliverable_ref: str     # optional link to the work for display; "" if none
    submitted_at: u256       # unix seconds; 0 until submitted
    verdict: str             # "" until adjudicated, then one of VALID_VERDICTS
    reasoning: str           # the panel's short explanation of the verdict
    resolved_at: u256        # unix seconds; 0 until resolved
    paid_to_freelancer: u256  # wei paid to the freelancer at settlement
    refunded_to_client: u256  # wei refunded to the client at settlement
    fee_paid: u256           # wei paid to the fee recipient at settlement


class Rubric(gl.Contract):
    owner: Address
    fee_recipient: Address
    fee_bps: u256
    next_id: u256
    created_total: u256
    resolved_total: u256
    jobs: TreeMap[u256, Job]
    job_ids: DynArray[u256]

    def __init__(self, fee_recipient: str, fee_bps: int):
        self.owner = gl.message.sender_address
        # A blank fee_recipient defaults to the deployer.
        if fee_recipient is None or len(fee_recipient) == 0:
            self.fee_recipient = gl.message.sender_address
        else:
            self.fee_recipient = Address(fee_recipient)
        capped = int(fee_bps)
        if capped < 0:
            capped = 0
        if capped > MAX_FEE_BPS:
            capped = MAX_FEE_BPS
        self.fee_bps = u256(capped)
        self.next_id = u256(1)

    # ----------------------------------------------------------------- writes

    @gl.public.write.min_gas(leader=15, validator=8).payable
    def create_job(
        self,
        freelancer: str,
        title: str,
        category: str,
        brief: str,
        criteria: str,
        deadline_days: int,
    ) -> u256:
        """Open and fund an escrow. The attached native GEN becomes the deposit.

        Payable, with an explicit gas floor via min_gas so the value transfer stays
        appealable under consensus.
        """
        deposit = int(gl.message.value)
        if deposit <= 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} a deposit is required to fund the job")
        if len(title.strip()) == 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} title is required")
        if len(brief.strip()) < 20:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} brief is too short to grade against")
        if len(criteria.strip()) < 10:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} acceptance criteria are required")
        days = int(deadline_days)
        if days <= 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} deadline_days must be positive")

        client = gl.message.sender_address
        freelancer_addr = Address(freelancer)
        if freelancer_addr == client:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} client and freelancer must differ")

        job_id = self.next_id
        now = _now()
        self.jobs[job_id] = Job(
            id=job_id,
            client=client,
            freelancer=freelancer_addr,
            title=title,
            category=category,
            brief=brief,
            criteria=criteria,
            deposit=u256(deposit),
            created_at=u256(now),
            deadline=u256(now + days * SECONDS_PER_DAY),
            status=STATUS_OPEN,
            deliverable="",
            deliverable_ref="",
            submitted_at=u256(0),
            verdict="",
            reasoning="",
            resolved_at=u256(0),
            paid_to_freelancer=u256(0),
            refunded_to_client=u256(0),
            fee_paid=u256(0),
        )
        self.job_ids.append(job_id)
        self.next_id = u256(int(job_id) + 1)
        self.created_total += u256(1)
        return job_id

    @gl.public.write
    def submit_deliverable(self, job_id: u256, deliverable: str, reference: str) -> None:
        """Freelancer submits the finished work as text (plus an optional link)."""
        job = self._require_job(job_id)
        if job.status != STATUS_OPEN:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} job is not open for submission")
        if gl.message.sender_address != job.freelancer:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} only the named freelancer can submit")
        if len(deliverable.strip()) < 20:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} deliverable is too short to grade")

        job.deliverable = deliverable
        job.deliverable_ref = reference
        job.submitted_at = u256(_now())
        job.status = STATUS_SUBMITTED

    @gl.public.write
    def cancel_job(self, job_id: u256) -> None:
        """Client reclaims the deposit while the job is still open (no submission yet)."""
        job = self._require_job(job_id)
        if gl.message.sender_address != job.client:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} only the client can cancel")
        if job.status != STATUS_OPEN:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} only an open job can be cancelled")

        refund = int(job.deposit)
        job.status = STATUS_CANCELLED
        job.resolved_at = u256(_now())
        job.refunded_to_client = u256(refund)
        self.resolved_total += u256(1)
        self._pay(job.client, refund)

    @gl.public.write.min_gas(leader=25, validator=15)
    def adjudicate(self, job_id: u256) -> None:
        """Grade a submitted deliverable against its brief and criteria, then settle.

        Validators each re-run the grading and agree only on the bounded `verdict`
        field. Funds move only after consensus, in deterministic code below.
        The explicit gas floor reserves headroom for the non-deterministic grading
        and the settlement transfers.
        """
        job = self._require_job(job_id)
        if job.status != STATUS_SUBMITTED:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} job has no deliverable awaiting a verdict")

        title = job.title
        category = job.category
        brief = job.brief
        criteria = job.criteria
        deliverable = job.deliverable

        def leader_fn() -> dict:
            prompt = f"""You are one juror on an impartial panel grading freelance creative work \
for an escrow payout. Judge only whether the DELIVERABLE satisfies the client's BRIEF \
and ACCEPTANCE CRITERIA. Ignore minor typos and formatting. Do not invent requirements \
that are not in the brief or criteria.

PROJECT TITLE: {title}
CATEGORY: {category}

BRIEF (what the client asked for):
---
{brief}
---

ACCEPTANCE CRITERIA (the rubric to grade against):
---
{criteria}
---

DELIVERABLE (the freelancer's submitted work):
---
{deliverable}
---

Choose exactly one verdict:
  "accept"  - the deliverable meets the brief and satisfies essentially all criteria.
  "partial" - the deliverable is on-topic and usable but misses or weakly meets some criteria.
  "reject"  - the deliverable is off-brief, fails most criteria, or is unusable.

Respond with ONLY a JSON object, no prose:
{{"verdict": "accept|partial|reject", "reasoning": "<one or two sentences citing the criteria>"}}"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = _parse_json(raw)
            verdict = _verdict_of(parsed)
            reasoning = _reasoning_of(parsed)
            return {"verdict": verdict, "reasoning": reasoning}

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)
            try:
                mine = leader_fn()
                leader_verdict = _verdict_of(leaders_res.calldata)
            except gl.vm.UserError:
                return False
            # Agree only on the bounded decision field; wording of reasoning may differ.
            return mine["verdict"] == leader_verdict

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        # --- deterministic settlement (runs only after consensus) -------------
        verdict = _verdict_of(result)
        reasoning = str(result.get("reasoning", ""))[:400]
        deposit = int(job.deposit)
        now = _now()

        job.verdict = verdict
        job.reasoning = reasoning
        job.resolved_at = u256(now)

        pay_freelancer = 0
        refund_client = 0
        if verdict == VERDICT_ACCEPT:
            pay_freelancer = deposit
            job.status = STATUS_ACCEPTED
        elif verdict == VERDICT_PARTIAL:
            pay_freelancer = deposit * PARTIAL_BPS // BPS_DENOMINATOR
            refund_client = deposit - pay_freelancer
            job.status = STATUS_PARTIAL
        else:  # VERDICT_REJECT
            refund_client = deposit
            job.status = STATUS_REJECTED

        # Protocol fee is charged only on funds released to the freelancer.
        fee = pay_freelancer * int(self.fee_bps) // BPS_DENOMINATOR
        net_freelancer = pay_freelancer - fee

        job.paid_to_freelancer = u256(net_freelancer)
        job.refunded_to_client = u256(refund_client)
        job.fee_paid = u256(fee)
        self.resolved_total += u256(1)

        if net_freelancer > 0:
            self._pay(job.freelancer, net_freelancer)
        if refund_client > 0:
            self._pay(job.client, refund_client)
        if fee > 0:
            self._pay(self.fee_recipient, fee)

    # ------------------------------------------------------------------- views

    @gl.public.view
    def get_config(self) -> dict:
        return {
            "owner": self.owner.as_hex,
            "fee_recipient": self.fee_recipient.as_hex,
            "fee_bps": int(self.fee_bps),
            "partial_bps": PARTIAL_BPS,
            "max_fee_bps": MAX_FEE_BPS,
        }

    @gl.public.view
    def get_stats(self) -> dict:
        open_jobs = 0
        submitted = 0
        accepted = 0
        partial = 0
        rejected = 0
        cancelled = 0
        escrowed = 0
        released = 0
        for jid in self.job_ids:
            job = self.jobs[jid]
            status = job.status
            if status == STATUS_OPEN:
                open_jobs += 1
                escrowed += int(job.deposit)
            elif status == STATUS_SUBMITTED:
                submitted += 1
                escrowed += int(job.deposit)
            elif status == STATUS_ACCEPTED:
                accepted += 1
                released += int(job.paid_to_freelancer)
            elif status == STATUS_PARTIAL:
                partial += 1
                released += int(job.paid_to_freelancer)
            elif status == STATUS_REJECTED:
                rejected += 1
            elif status == STATUS_CANCELLED:
                cancelled += 1
        return {
            "jobs": len(self.job_ids),
            "open": open_jobs,
            "submitted": submitted,
            "accepted": accepted,
            "partial": partial,
            "rejected": rejected,
            "cancelled": cancelled,
            "escrowed_wei": str(escrowed),
            "released_wei": str(released),
        }

    @gl.public.view
    def get_job(self, job_id: u256) -> dict:
        return self._job_view(self._require_job(job_id))

    @gl.public.view
    def list_jobs(self) -> list:
        return [self._job_view(self.jobs[jid]) for jid in self.job_ids]

    @gl.public.view
    def get_jobs_by_status(self, status: str) -> list:
        want = status.strip().upper()
        out = []
        for jid in self.job_ids:
            job = self.jobs[jid]
            if job.status == want:
                out.append(self._job_view(job))
        return out

    # --------------------------------------------------------------- internals

    def _require_job(self, job_id: u256) -> Job:
        if job_id not in self.jobs:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} job not found")
        return self.jobs[job_id]

    def _job_view(self, job: Job) -> dict:
        return {
            "id": int(job.id),
            "client": job.client.as_hex,
            "freelancer": job.freelancer.as_hex,
            "title": job.title,
            "category": job.category,
            "brief": job.brief,
            "criteria": job.criteria,
            "deposit_wei": str(int(job.deposit)),
            "created_at": int(job.created_at),
            "deadline": int(job.deadline),
            "status": job.status,
            "deliverable": job.deliverable,
            "deliverable_ref": job.deliverable_ref,
            "submitted_at": int(job.submitted_at),
            "verdict": job.verdict,
            "reasoning": job.reasoning,
            "resolved_at": int(job.resolved_at),
            "paid_to_freelancer_wei": str(int(job.paid_to_freelancer)),
            "refunded_to_client_wei": str(int(job.refunded_to_client)),
            "fee_paid_wei": str(int(job.fee_paid)),
        }

    def _pay(self, to: Address, amount: int) -> None:
        if amount > 0:
            gl.get_contract_at(to).emit_transfer(value=u256(amount), on="finalized")


# -------------------------------------------------------------- module helpers

def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _parse_json(text: typing.Any) -> dict:
    """Best-effort extraction of a JSON object from an LLM response."""
    if isinstance(text, dict):
        return text
    if not isinstance(text, str):
        raise gl.vm.UserError(f"{ERROR_LLM} model returned non-text: {type(text)}")
    first = text.find("{")
    last = text.rfind("}")
    if first == -1 or last == -1 or last <= first:
        raise gl.vm.UserError(f"{ERROR_LLM} no JSON object in model output")
    blob = text[first : last + 1]
    try:
        return json.loads(blob)
    except Exception:
        raise gl.vm.UserError(f"{ERROR_LLM} unparseable JSON from model")


def _verdict_of(data: typing.Any) -> str:
    """Reduce a model response to the single stable consensus field."""
    if not isinstance(data, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} expected JSON object, got {type(data)}")
    raw = data.get("verdict")
    if raw is None:
        for alt in ("decision", "result", "grade", "label"):
            if alt in data:
                raw = data[alt]
                break
    verdict = str(raw).strip().lower() if raw is not None else ""
    # Tolerate common synonyms the model may emit.
    if verdict in ("accepted", "approve", "approved", "pass", "passed"):
        verdict = VERDICT_ACCEPT
    elif verdict in ("partially", "partial_accept", "accept_with_issues", "revise"):
        verdict = VERDICT_PARTIAL
    elif verdict in ("rejected", "fail", "failed", "deny", "denied"):
        verdict = VERDICT_REJECT
    if verdict not in VALID_VERDICTS:
        raise gl.vm.UserError(f"{ERROR_LLM} invalid verdict: {verdict!r}")
    return verdict


def _reasoning_of(data: dict) -> str:
    value = data.get("reasoning")
    if value is None:
        for alt in ("reason", "explanation", "rationale", "analysis"):
            if alt in data:
                value = data[alt]
                break
    if value is None:
        value = ""
    return str(value)[:400]


def _handle_leader_error(leaders_res: gl.vm.Result, leader_fn: typing.Callable) -> bool:
    """Compare a failing leader against an independent validator run."""
    leader_msg = leaders_res.message if hasattr(leaders_res, "message") else ""
    try:
        leader_fn()
        return False  # leader errored but validator succeeded -> disagree
    except gl.vm.UserError as exc:
        validator_msg = exc.message if hasattr(exc, "message") else str(exc)
        # Deterministic business errors must match exactly.
        if validator_msg.startswith(ERROR_EXPECTED):
            return validator_msg == leader_msg
        # LLM misbehaviour: disagree to force a new leader.
        return False
    except Exception:
        return False
