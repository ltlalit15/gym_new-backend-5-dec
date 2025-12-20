import cron from "node-cron";
import { pool } from "../config/db.js";
export const startMemberExpiryCron = () => {
  cron.schedule("0 3 * * *", async () => {
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

      const nowIST = "CONVERT_TZ(NOW(), '+00:00', '+05:30')";
      console.log(
        `⏳ PT auto-complete cron started | IST: ${new Date().toLocaleString(
          "en-IN",
          { timeZone: "Asia/Kolkata" }
        )}`
      );

      /* =====================================
         1️⃣ UPCOMING → ACTIVE
         (Force ACTIVE if the session is in the window)
      ===================================== */
      const [activateResult] = await pool.query(`
        UPDATE session
        SET status = 'Active'
        WHERE status = 'Upcoming'
          AND ${nowIST} BETWEEN
              TIMESTAMP(DATE(date), time)
              AND
              TIMESTAMP(
                DATE(date),
                ADDTIME(time, SEC_TO_TIME(duration * 60))
              )
      `);

      if (activateResult.affectedRows > 0) {
        console.log(`▶️ Sessions activated: ${activateResult.affectedRows}`);
      }

      /* =====================================
         2️⃣ ACTIVE → COMPLETE
         (Only if current time has passed session end time)
      ===================================== */
      const [completeResult] = await pool.query(`
        UPDATE session
        SET status = 'Complete'
        WHERE status = 'Active'
          AND ${nowIST} >
              TIMESTAMP(
                DATE(date),
                ADDTIME(time, SEC_TO_TIME(duration * 60))
              )
      `);

      if (completeResult.affectedRows > 0) {
        console.log(`🏁 Sessions completed: ${completeResult.affectedRows}`);
      }

      /* =====================================
         3️⃣ UPCOMING → COMPLETE (MISSED)
         (server / cron was down, mark missed session complete)
      ===================================== */
      const [missedResult] = await pool.query(`
        UPDATE session
        SET status = 'Complete'
        WHERE status = 'Upcoming'
          AND ${nowIST} >
              TIMESTAMP(
                DATE(date),
                ADDTIME(time, SEC_TO_TIME(duration * 60))
              )
      `);

      if (missedResult.affectedRows > 0) {
        console.log(`⚠️ Missed sessions auto-completed: ${missedResult.affectedRows}`);
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