import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Repeat, ShieldCheck, Layers, ArrowRight } from "lucide-react";
import CardCarousel from "@/components/landing/CardCarousel";
import { useAuth } from "@/shared/context/AuthContext";

const features = [
  { icon: Sparkles, title: "Native yield", body: "Rewards accrue automatically to your balance — no staking, no lockups, no manual claims." },
  { icon: Repeat, title: "Auto-compounding", body: "Earnings reinvest continuously so your digital dollars keep working around the clock." },
  { icon: Layers, title: "DeFi-connected", body: "One tap to route liquidity into Aave, Compound and the protocols you already trust." },
  { icon: ShieldCheck, title: "Fully backed", body: "Every Easyx dollar is collateralized and independently attested for total peace of mind." },
];

const stats = [
  { num: "$1.4B+", label: "Value settled on Easyx" },
  { num: "6.8%", label: "Average blended APY" },
  { num: "40+", label: "Integrated protocols" },
  { num: "120k", label: "Wallets earning daily" },
];

const fade = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] },
};

export default function Sections() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  return (
    <>
      <section className="section sec-dark" data-testid="section-features">
        <div className="wrap">
          <motion.p className="eyebrow" {...fade}>What Easyx does</motion.p>
          <motion.h2 className="sec-title" {...fade}>
            A digital dollar that<br />earns on its own.
          </motion.h2>

          <motion.h3 className="carousel-title" data-testid="carousel-title" {...fade}>
            <span className="carousel-title__hl">Investment plans</span>
          </motion.h3>
          <motion.div className="easyx-carousel" data-testid="easyx-carousel" {...fade}>
            <CardCarousel />
          </motion.div>
          <div className="feat-grid">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="feat-card"
                data-testid={`feature-card-${i}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className="feat-icon"><f.icon size={26} /></div>
                <h3 className="font-display">{f.title}</h3>
                <p className="font-body">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section sec-light" data-testid="section-stats">
        <div className="wrap">
          <motion.p className="eyebrow" {...fade}>By the numbers</motion.p>
          <motion.h2 className="sec-title" {...fade}>
            Momentum you can measure.
          </motion.h2>
          <div className="stats">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                data-testid={`stat-${i}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
              >
                <div className="stat-num font-display">{s.num}</div>
                <div className="stat-label font-body">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div className="cta-band" data-testid="cta-band" {...fade}>
            <h2 className="sec-title" style={{ color: "#efecf6" }}>
              Put your wealth to work.
            </h2>
            <p className="font-body" style={{ color: "#a7a1b8", maxWidth: "42ch", margin: "18px auto 30px", fontSize: "1.15rem", lineHeight: 1.5 }}>
              Open a Easyx wallet in seconds and start earning native, reward-powered yield today.
            </p>
            <button
              className="btn-pill hero__cta"
              data-testid="cta-band-btn"
              style={{ margin: "0 auto" }}
              onClick={() => navigate(user ? (isAdmin ? "/admin" : "/dashboard") : "/register")}
            >
              Join us
              <span className="hero__cta-arrow"><ArrowRight size={22} /></span>
            </button>
          </motion.div>
        </div>
      </section>

      <footer className="footer font-body" data-testid="footer">
        <div className="footer__row">
          <span style={{ fontFamily: "Bricolage Grotesque, sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "#efecf6" }}>Easyx</span>
          <span>© {new Date().getFullYear()} Easyx Finance. All rights reserved.</span>
        </div>
      </footer>
    </>
  );
}
