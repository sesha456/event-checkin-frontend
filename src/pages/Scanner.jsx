import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { qrCheckInFromUrl } from "../services/api";

export default function Scanner() {
  const qrRef = useRef(null);
  const isRunning = useRef(false);

  const [message, setMessage] = useState("Starting scanner...");
  const [status, setStatus] = useState("info");
  const [action, setAction] = useState(null);

  useEffect(() => {
    let qr;

    const startScanner = async () => {
      try {
        qr = new Html5Qrcode("reader");
        qrRef.current = qr;

        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          async (decodedText) => {
            if (!isRunning.current) return;
            isRunning.current = false;

            try {
              setStatus("info");
              setMessage("Processing...");
              setAction(null);

              const data = await qrCheckInFromUrl(decodedText);
              setAction(data.action);

              if (data.action === "checked_in" || data.action === "checked_in_again") {
                setStatus("success");
                new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3").play();
              } else if (data.action === "checked_out") {
                setStatus("warning");
                new Audio("https://www.soundjay.com/buttons/sounds/button-09.mp3").play();
              } else if (data.action === "already_checked_in") {
                setStatus("error");
              }

              setMessage(data.message);

            } catch (err) {
              setStatus("error");
              setMessage(err.message || "Scan failed ❌");
            }

            await qr.stop();
            setTimeout(() => { window.location.reload(); }, 3000);
          }
        );

        isRunning.current = true;
        setStatus("success");
        setMessage("Scanner ready ✅");
      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage("Scanner failed to start ❌");
      }
    };

    const timer = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timer);
      if (qrRef.current && isRunning.current) {
        qrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <main className="page">
      <section className="card scanner-card">
        <div className="page-header">
          <h1>📷 QR Scanner</h1>
        </div>

        <div className="scanner-layout">
          <div className="video-panel">
            <div id="reader" style={{ width: "100%", minHeight: "320px", borderRadius: "12px" }} />
          </div>

          <div className="scanner-help">
            {action && (
              <div className={`action-banner ${
                action === "checked_in" || action === "checked_in_again" ? "banner-success" :
                action === "checked_out" ? "banner-warning" : "banner-error"
              }`}>
                {action === "checked_in"        && "✅ CHECKED IN"}
                {action === "checked_in_again"  && "✅ RE-ENTERED"}
                {action === "checked_out"        && "👋 CHECKED OUT"}
                {action === "already_checked_in" && "⏳ ALREADY INSIDE"}
              </div>
            )}

            <p className={`scan-message ${status}`}>{message}</p>

            <ul className="help-list">
              <li>Point camera at QR code</li>
              <li>Hold steady for 1–2 seconds</li>
              <li>Ensure good lighting</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}