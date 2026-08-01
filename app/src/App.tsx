import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { Ledger } from "./components/Ledger";
import { Console } from "./components/Console";
import { Docs } from "./components/Docs";
import { Footer } from "./components/Footer";
import { api, type Config, type Stats, type Job } from "./lib/genlayer";
import { useWallet } from "./lib/wallet";

export default function App() {
  const wallet = useWallet();
  const [config, setConfig] = useState<Config | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    // Read sequentially to avoid a burst against the RPC on first paint.
    try {
      const cfg = await api.getConfig();
      setConfig(cfg);
      const st = await api.getStats();
      setStats(st);
      const js = await api.listJobs();
      // Newest first.
      setJobs([...js].sort((a, b) => b.id - a.id));
    } catch (e: any) {
      setError(e?.message ? String(e.message).slice(0, 200) : "network error");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh after a write settles: retry a couple of times since accepted state
  // can lag a read by a moment.
  const refresh = useCallback(() => {
    load();
    setTimeout(load, 4000);
  }, [load]);

  return (
    <div className="min-h-screen">
      <Header wallet={wallet} />
      <main>
        <Hero stats={stats} />
        <HowItWorks />
        <Ledger jobs={jobs} loading={loading} error={error} onRefresh={refresh} wallet={wallet} />
        <Console wallet={wallet} onChange={refresh} />
        <Docs config={config} />
      </main>
      <Footer />
    </div>
  );
}
