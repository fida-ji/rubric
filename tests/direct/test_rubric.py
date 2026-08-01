"""Direct-mode tests for the Rubric creative-work escrow contract."""

from conftest import (
    CONTRACT, FEE_RECIPIENT, FEE_BPS, GEN,
    mock_verdict, addr_hex,
)

TITLE = "Landing page hero copy"
CATEGORY = "copywriting"
BRIEF = (
    "Write hero copy for a developer tools landing page. One headline under 12 "
    "words and two supporting sentences. Plain, concrete, no buzzwords."
)
CRITERIA = "Headline under 12 words; two supporting sentences; no marketing buzzwords."
DELIVERABLE = (
    "Ship code, not config. Rubric holds payment in escrow and releases it when an "
    "AI panel agrees the work meets your brief. No middlemen, no disputes by email."
)


def _deploy(direct_deploy):
    return direct_deploy(CONTRACT, FEE_RECIPIENT, FEE_BPS)


def _create(c, direct_vm, client, freelancer, deposit=10 * GEN, days=14):
    direct_vm.sender = client
    direct_vm.value = deposit
    jid = c.create_job(addr_hex(freelancer), TITLE, CATEGORY, BRIEF, CRITERIA, days)
    direct_vm.value = 0
    return jid


# ------------------------------------------------------------------- creation
def test_create_job_funds_escrow(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob, deposit=10 * GEN)

    job = c.get_job(jid)
    assert job["status"] == "OPEN"
    assert job["client"].lower() == addr_hex(direct_alice).lower()
    assert job["freelancer"].lower() == addr_hex(direct_bob).lower()
    assert job["deposit_wei"] == str(10 * GEN)
    assert job["verdict"] == ""

    stats = c.get_stats()
    assert stats["jobs"] == 1
    assert stats["open"] == 1
    assert stats["escrowed_wei"] == str(10 * GEN)


def test_create_job_requires_deposit(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with direct_vm.expect_revert("a deposit is required"):
        c.create_job(addr_hex(direct_bob), TITLE, CATEGORY, BRIEF, CRITERIA, 14)


def test_create_job_rejects_short_brief(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 5 * GEN
    with direct_vm.expect_revert("brief is too short"):
        c.create_job(addr_hex(direct_bob), TITLE, CATEGORY, "too short", CRITERIA, 14)


def test_create_job_rejects_self_dealing(direct_vm, direct_deploy, direct_alice):
    c = _deploy(direct_deploy)
    direct_vm.sender = direct_alice
    direct_vm.value = 5 * GEN
    with direct_vm.expect_revert("client and freelancer must differ"):
        c.create_job(addr_hex(direct_alice), TITLE, CATEGORY, BRIEF, CRITERIA, 14)


# ----------------------------------------------------------------- submission
def test_submit_deliverable_transitions_to_submitted(direct_vm, direct_deploy,
                                                      direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob)

    direct_vm.sender = direct_bob
    c.submit_deliverable(jid, DELIVERABLE, "https://example.com/work")

    job = c.get_job(jid)
    assert job["status"] == "SUBMITTED"
    assert job["deliverable"] == DELIVERABLE
    assert job["deliverable_ref"] == "https://example.com/work"
    assert job["submitted_at"] > 0


def test_only_named_freelancer_can_submit(direct_vm, direct_deploy,
                                          direct_alice, direct_bob, direct_charlie):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only the named freelancer"):
        c.submit_deliverable(jid, DELIVERABLE, "")


def test_cannot_submit_twice(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    c.submit_deliverable(jid, DELIVERABLE, "")
    with direct_vm.expect_revert("job is not open for submission"):
        c.submit_deliverable(jid, DELIVERABLE, "")


# ----------------------------------------------------------------- cancellation
def test_client_cancels_open_job_and_is_refunded(direct_vm, direct_deploy,
                                                  direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob, deposit=7 * GEN)

    direct_vm.sender = direct_alice
    c.cancel_job(jid)

    job = c.get_job(jid)
    assert job["status"] == "CANCELLED"
    assert job["refunded_to_client_wei"] == str(7 * GEN)


def test_non_client_cannot_cancel(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only the client can cancel"):
        c.cancel_job(jid)


def test_cannot_cancel_after_submission(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    c.submit_deliverable(jid, DELIVERABLE, "")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only an open job can be cancelled"):
        c.cancel_job(jid)


# --------------------------------------------------------------- adjudication
def test_accept_pays_freelancer_minus_fee(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob, deposit=10 * GEN)
    direct_vm.sender = direct_bob
    c.submit_deliverable(jid, DELIVERABLE, "")

    mock_verdict(direct_vm, "accept", "Meets every criterion.")
    direct_vm.sender = direct_alice
    c.adjudicate(jid)

    job = c.get_job(jid)
    fee = 10 * GEN * FEE_BPS // 10000
    assert job["status"] == "ACCEPTED"
    assert job["verdict"] == "accept"
    assert job["paid_to_freelancer_wei"] == str(10 * GEN - fee)
    assert job["fee_paid_wei"] == str(fee)
    assert job["refunded_to_client_wei"] == "0"


def test_partial_splits_payment(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob, deposit=10 * GEN)
    direct_vm.sender = direct_bob
    c.submit_deliverable(jid, DELIVERABLE, "")

    mock_verdict(direct_vm, "partial", "On topic but missed one criterion.")
    direct_vm.sender = direct_alice
    c.adjudicate(jid)

    job = c.get_job(jid)
    gross = 10 * GEN * 6000 // 10000     # PARTIAL_BPS = 60%
    fee = gross * FEE_BPS // 10000
    assert job["status"] == "PARTIAL"
    assert job["verdict"] == "partial"
    assert job["paid_to_freelancer_wei"] == str(gross - fee)
    assert job["refunded_to_client_wei"] == str(10 * GEN - gross)
    assert job["fee_paid_wei"] == str(fee)


def test_reject_refunds_client_fully(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob, deposit=10 * GEN)
    direct_vm.sender = direct_bob
    c.submit_deliverable(jid, DELIVERABLE, "")

    mock_verdict(direct_vm, "reject", "Off brief and unusable.")
    direct_vm.sender = direct_alice
    c.adjudicate(jid)

    job = c.get_job(jid)
    assert job["status"] == "REJECTED"
    assert job["verdict"] == "reject"
    assert job["paid_to_freelancer_wei"] == "0"
    assert job["refunded_to_client_wei"] == str(10 * GEN)
    assert job["fee_paid_wei"] == "0"


def test_cannot_adjudicate_before_submission(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob)
    mock_verdict(direct_vm, "accept")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("no deliverable awaiting a verdict"):
        c.adjudicate(jid)


def test_synonym_verdict_is_normalized(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    jid = _create(c, direct_vm, direct_alice, direct_bob, deposit=4 * GEN)
    direct_vm.sender = direct_bob
    c.submit_deliverable(jid, DELIVERABLE, "")

    mock_verdict(direct_vm, "approved", "Looks good.")  # synonym for accept
    direct_vm.sender = direct_alice
    c.adjudicate(jid)

    assert c.get_job(jid)["verdict"] == "accept"


# ---------------------------------------------------------------------- views
def test_config_and_listing(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_deploy)
    cfg = c.get_config()
    assert cfg["fee_bps"] == FEE_BPS
    assert cfg["partial_bps"] == 6000
    assert cfg["fee_recipient"].lower() == FEE_RECIPIENT.lower()

    _create(c, direct_vm, direct_alice, direct_bob)
    _create(c, direct_vm, direct_alice, direct_bob)
    assert len(c.list_jobs()) == 2
    assert len(c.get_jobs_by_status("open")) == 2
    assert len(c.get_jobs_by_status("accepted")) == 0
