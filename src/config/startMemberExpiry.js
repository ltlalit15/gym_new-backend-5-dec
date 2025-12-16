import cron from "node-cron";
import { pool } from "../config/db.js";
export const startMemberExpiryCron = () => {
  // Runs every day at 5:55 PM IST (12:25 PM UTC)
  cron.schedule("25 12 * * *", async () => {
    try {
      // 🇮🇳 Get current IST time for logs
      const istTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      console.log(`⏳ Running membership expiry cron | IST Time: ${istTime}`);

      await pool.query(`
        UPDATE member
        SET status = 'INACTIVE'
        WHERE status = 'ACTIVE'
          AND membershipTo IS NOT NULL
          AND membershipTo < NOW()
      `);

      console.log(`✅ Expired members marked INACTIVE | IST Time: ${istTime}`);

    } catch (err) {
      console.error("❌ Membership expiry cron failed", err);
    }
  });
};