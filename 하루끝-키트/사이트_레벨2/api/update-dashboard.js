import { spawn } from 'child_process';
import { join } from 'path';

export default async function handler(req, res) {
  try {
    // 크론 요청 확인 (Vercel 내부 요청만 허용)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // session-dashboard.mjs 실행
    const dashboardPath = join(process.cwd(), '../../automations/session-dashboard.mjs');

    const child = spawn('node', [dashboardPath], {
      cwd: process.cwd(),
      timeout: 30000
    });

    let output = '';
    let error = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      error += data.toString();
    });

    return new Promise((resolve) => {
      child.on('close', (code) => {
        if (code === 0) {
          res.status(200).json({
            success: true,
            message: 'Dashboard updated',
            output: output.trim()
          });
        } else {
          res.status(500).json({
            success: false,
            error: error || 'Script failed',
            output
          });
        }
        resolve();
      });

      child.on('error', (err) => {
        res.status(500).json({
          success: false,
          error: err.message
        });
        resolve();
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
