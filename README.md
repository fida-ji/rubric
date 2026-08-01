# Rubric

**Escrow for creative work, settled by a decentralized AI panel.**

Rubric is a dapp on [GenLayer](https://genlayer.com) for paying freelancers on results instead
of trust. A client funds a brief on-chain, the freelancer delivers the work, and a panel of
independent AI validators grades the deliverable against the acceptance criteria. Their
consensus verdict releases the payment, splits it, or refunds it. No platform, arbiter, or
single model decides the outcome.

- **Live app:** [rubric-escrow.web.app](https://rubric-escrow.web.app)
- **Source:** [github.com/fida-ji/rubric](https://github.com/fida-ji/rubric)
- **Live contract (Testnet Bradbury):**
  [`0x5688061Df3b231cdF3D4703b8D9cC7234723D2A8`](https://explorer-bradbury.genlayer.com/address/0x5688061Df3b231cdF3D4703b8D9cC7234723D2A8)
- **Deploy transaction:**
  [`0xab75e04adaef78eee88c298cb9b23582de656b2a73cb557c052022d28ba5cded`](https://explorer-bradbury.genlayer.com/tx/0xab75e04adaef78eee88c298cb9b23582de656b2a73cb557c052022d28ba5cded)
- **Network:** GenLayer Testnet Bradbury, chain id 4221

## Why GenLayer

Whether a deliverable "meets the brief" is a judgment, not a fact. A plain smart contract
cannot make that call, and a centralized service grading its own payouts is a conflict of
interest. On GenLayer, every validator runs a language model, grades the same brief and
deliverable independently, and the network reaches consensus only when the verdicts match.
The contract owns the escrowed funds, the state machine, and the settlement math, all of
which are deterministic. The one subjective step, the grade, is exactly the part GenLayer
exists to secure.

## How it works

1. **Client funds a brief.** `create_job` names a freelancer, records the brief and the
   acceptance criteria, and escrows the attached GEN.
2. **Freelancer delivers.** `submit_deliverable` stores the finished work as text. Only the
   named freelancer can submit, and only while the job is open.
3. **A panel grades the work.** `adjudicate` runs a non-deterministic block: the leader
   grades the deliverable against the criteria and proposes a verdict, and the other
   validators re-grade independently. Consensus is reached only on the bounded verdict
   field: `accept`, `partial`, or `reject`.
4. **The escrow settles deterministically**, in the same transaction as the verdict:

   | Verdict   | Freelancer               | Client          | Protocol fee |
   | --------- | ------------------------ | --------------- | ------------ |
   | `accept`  | deposit minus 1% fee     | nothing         | 1% of payout |
   | `partial` | 60% of deposit minus fee | remaining 40%   | 1% of payout |
   | `reject`  | nothing                  | full deposit    | none         |

   A client can also `cancel_job` for a full refund while a job is still open.

## Live seeded escrows

The deployed contract holds real, adjudicated escrows so the app renders actual data from
the first load. Each one was created, submitted, and graded by the GenLayer validator
panel, and the payouts really moved on-chain:

| # | Job                                 | Verdict          |
| - | ----------------------------------- | ---------------- |
| 1 | Two-sentence product description    | accepted         |
| 2 | Python helper: `add(a, b)`          | accepted         |
| 3 | Product FAQ: three required answers | partial          |
| 4 | Python helper: `slugify(text)`      | rejected         |
| 5 | Release notes for v2.0              | awaiting verdict |

Job #5 is deliberately left unadjudicated. Anyone can convene the panel for it from the
app's console and watch the escrow settle live. Current totals are readable any time via
`get_stats` on the [contract page](https://explorer-bradbury.genlayer.com/address/0x5688061Df3b231cdF3D4703b8D9cC7234723D2A8).

## Tech stack

- **Contract:** GenLayer Intelligent Contract in Python 3.12, using
  `gl.vm.run_nondet_unsafe` for validator consensus on the verdict and `emit_transfer`
  for settlement payouts.
- **Contract tooling:** `genvm-lint` for AST and SDK validation, `genlayer-test` for
  direct-mode pytest runs (16 tests, in-memory, no network).
- **Deploy and seed scripts:** [`genlayer-js`](https://www.npmjs.com/package/genlayer-js)
  on Node ESM against Testnet Bradbury.
- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS, genlayer-js, and an injected
  EIP-1193 wallet connector with Bradbury chain switch/add. No MetaMask Snaps required.

## Repository layout

```
contracts/rubric.py     GenLayer Intelligent Contract (Python 3.12)
tests/direct/           Direct-mode contract tests (pytest)
deploy/                 deploy.mjs and seed.mjs (genlayer-js on Bradbury)
app/                    React + Vite + genlayer-js frontend
firebase.json           Firebase Hosting config (builds and serves app/dist)
netlify.toml            Netlify build config (alternative hosting)
requirements.txt        Contract toolchain (genvm-linter, genlayer-test)
gltest.config.yaml      Contract test network configuration
```

## Contract API

**Write methods**

- `create_job(freelancer, title, category, brief, criteria, deadline_days)` (payable):
  opens and funds a job.
- `submit_deliverable(job_id, deliverable, reference)`: the named freelancer submits work.
- `adjudicate(job_id)`: anyone convenes the panel; the verdict settles the escrow.
- `cancel_job(job_id)`: the client refunds an open job.

**View methods**

- `get_config`, `get_stats`, `list_jobs`, `get_job(job_id)`, `get_jobs_by_status(status)`.

## Develop

### Lint and test the contract

```bash
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt

genvm-lint check contracts/rubric.py
pytest tests/direct/ -q
```

### Deploy and seed on Bradbury

Copy `.env.example` to `.env` and set `ACCOUNT_PRIVATE_KEY` to a funded Bradbury account
(get test GEN from the [GenLayer faucet](https://testnet-faucet.genlayer.foundation)).
`FEE_RECIPIENT` and `FEE_BPS` are optional.

```bash
cd deploy
npm install
node deploy.mjs   # prints the deployed address and writes artifacts/
node seed.mjs     # creates and adjudicates example jobs
```

### Run the frontend

```bash
cd app
npm install
npm run dev       # local development server
npm run build     # production build into app/dist
```

The deployed contract address is baked into `app/src/config.ts`, so the built site works
with zero configuration. To point the app at another deployment, set
`VITE_CONTRACT_ADDRESS` before building.

## Deploy the frontend with Firebase

The repo is ready for [Firebase Hosting](https://firebase.google.com/docs/hosting).
`firebase.json` builds `app/` and serves `app/dist` as a single-page app with the correct
cache headers.

```bash
npm install -g firebase-tools
firebase login
firebase init hosting --project <your-project-id>   # select "Use an existing project"
firebase deploy
```

`firebase init` only adds a `.firebaserc` with your project id; the committed
`firebase.json` already contains the build command, the SPA rewrite, and the caching
rules. To override the contract address at build time, set `VITE_CONTRACT_ADDRESS` in
your shell before `firebase deploy`.

A `netlify.toml` is also included if you prefer Netlify; it builds `app/` and publishes
`app/dist`.

## Security notes

- The private key lives only in the git-ignored `.env` and is read via `process.env` in
  the deploy and seed scripts. It is never logged, baked into the frontend, or committed.
- The frontend needs no secrets at all: the only configuration is the public contract
  address.
- All amounts on Bradbury are testnet GEN with no monetary value.
- `adjudicate` is intentionally callable by anyone: convening the panel is a public good,
  and the outcome is decided by validator consensus, not by the caller.

## License

MIT
