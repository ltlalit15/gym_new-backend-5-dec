import cron from "node-cron";
import { pool } from "../config/db.js";
export const startMemberExpiryCron = () => {
  cron.schedule("25 12 * * *", async () => {
    let lockAcquired = false;

    try {
      const [[lock]] = await pool.query(
        `SELECT GET_LOCK('member_expiry_cron', 0) AS acquired`
      );

      if (!lock.acquired) {
        console.log("⏭️ Membership expiry cron skipped (lock held)");
        return;
      }

      lockAcquired = true;

      const istTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      console.log(`⏳ Membership expiry cron started | IST: ${istTime}`);

      await pool.query(`
        UPDATE member
        SET status = 'Inactive'
        WHERE status = 'Active'
          AND membershipTo IS NOT NULL
          AND membershipTo < CONVERT_TZ(NOW(), '+00:00', '+05:30')
      `);

      console.log(`✅ Membership expiry completed | IST: ${istTime}`);
    } catch (err) {
      console.error("❌ Membership expiry cron failed", err);
    } finally {
      if (lockAcquired) {
        await pool.query(`SELECT RELEASE_LOCK('member_expiry_cron')`);
      }
    }
  });
};

export const startPTAutoCompleteCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    let lockAcquired = false;

    try {
      const [[lock]] = await pool.query(
        `SELECT GET_LOCK('pt_auto_complete_cron', 0) AS acquired`
      );

      if (!lock.acquired) {
        console.log("⏭️ PT auto-complete cron skipped (lock held)");
        return;
      }

      lockAcquired = true;

      const istTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      console.log(`⏳ PT auto-complete cron started | IST: ${istTime}`);

      const [result] = await pool.query(`
        UPDATE unified_bookings
        SET bookingStatus = 'Completed'
        WHERE bookingType = 'PT'
          AND bookingStatus = 'Booked'
          AND TIMESTAMP(
                COALESCE(endDate, date),
                endTime
              ) < CONVERT_TZ(NOW(), '+00:00', '+05:30')
      `);

      if (result.affectedRows > 0) {
        console.log(`✅ PT bookings completed: ${result.affectedRows}`);
      }
    } catch (err) {
      console.error("❌ PT auto-complete cron failed", err);
    } finally {
      if (lockAcquired) {
        await pool.query(`SELECT RELEASE_LOCK('pt_auto_complete_cron')`);
      }
    }
  });
};