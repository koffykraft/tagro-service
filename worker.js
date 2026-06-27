// TAGRO API — Cloudflare Worker v2
// Handles: SMS, Dropbox, Claude AI, Customer approval, KV Staff/Device/Logs
// Bindings: FAST2SMS_KEY, DROPBOX_TOKEN, ANTHROPIC_KEY, KV (TAGRO_DATA), R2 (tagro-manuals)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
function err(msg, status = 400) { return json({ ok: false, error: msg }, status); }

// ── MASTER NUMBERS ────────────────────────────────────────
const MASTERS = [
  { phone: '9656361846', name: 'T M Thomas', active: true },
  { phone: '9388312248', name: 'Master 2',   active: false }
];

// ── INITIAL STAFF DATA ────────────────────────────────────
const INITIAL_STAFF = [
  { name:'Vishnu',       branch:'KVR', role:'Manager', phone:'9656324446', models:[], active:true },
  { name:'Rajeev',       branch:'KVR', role:'Staff',   phone:'9656024446', models:[], active:true },
  { name:'Anandu',       branch:'KVR', role:'Staff',   phone:'7034163696', models:[], active:true },
  { name:'Thankachan',   branch:'KVR', role:'Staff',   phone:'9207468233', models:[], active:true },
  { name:'Anoop K P',    branch:'PKM', role:'Manager', phone:'9349401991', models:[], active:true },
  { name:'Anoop P G',    branch:'PKM', role:'Staff',   phone:'9656921115', models:[], active:true },
  { name:'Yedhu',        branch:'NDD', role:'Manager', phone:'9387689763', models:[], active:true },
  { name:'Ratheesh',     branch:'MDM', role:'Manager', phone:'9487878508', models:[], active:true },
  { name:'John Victor',  branch:'MDM', role:'Staff',   phone:'8144114514', models:[], active:true },
  { name:'Karthick',     branch:'SKT', role:'Manager', phone:'8190015130', models:[], active:true },
  { name:'Mahalakshmi',  branch:'SKT', role:'Staff',   phone:'9047208375', models:[], active:true },
  { name:'Jothi',        branch:'SKT', role:'Staff',   phone:'9786547517', models:[], active:true },
  { name:'OYR Manager',  branch:'OYR', role:'Manager', phone:'8921773286', models:[], active:true },
  { name:'SDM Manager',  branch:'SDM', role:'Manager', phone:'8921773285', models:[], active:true }
];

// ── INITIAL MODELS DATA ───────────────────────────────────
const INITIAL_MODELS = [
  { id:'MS 460', name:'MS 460', type:'Chainsaw',    branches:['KVR','NDD','MDM','PKM','SKT'] },
  { id:'MS 461', name:'MS 461', type:'Chainsaw',    branches:['KVR','NDD','MDM','PKM','SKT'] },
  { id:'MS 382', name:'MS 382', type:'Chainsaw',    branches:['KVR','NDD','MDM','PKM','SKT'] },
  { id:'MS 381', name:'MS 381', type:'Chainsaw',    branches:['KVR','NDD','MDM','PKM','SKT'] },
  { id:'MS 250', name:'MS 250', type:'Chainsaw',    branches:['KVR','NDD','MDM','PKM','SKT'] },
  { id:'MS 180', name:'MS 180', type:'Chainsaw',    branches:['KVR','NDD','MDM','PKM','SKT'] },
  { id:'MS 182', name:'MS 182', type:'Chainsaw',    branches:['KVR','NDD','MDM','PKM','SKT'] },
  { id:'FS 120', name:'FS 120', type:'Brushcutter', branches:['KVR','MDM','PKM','SKT'] },
  { id:'FS 250', name:'FS 250', type:'Brushcutter', branches:['KVR','PKM','SKT'] },
  { id:'FS 130', name:'FS 130', type:'Brushcutter', branches:['KVR','PKM'] },
  { id:'SR 420', name:'SR 420', type:'Sprayer',     branches:['KVR','PKM'] },
  { id:'SR 450', name:'SR 450', type:'Sprayer',     branches:['KVR','PKM'] },
  { id:'BR 600', name:'BR 600', type:'Blower',      branches:['KVR','PKM'] },
  { id:'MS 660', name:'MS 660', type:'Chainsaw',    branches:['KVR','MDM','PKM'] },
  { id:'MS 661', name:'MS 661', type:'Chainsaw',    branches:['MDM'] }
];

export default {
  async fetch(request, env) {

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url  = new URL(request.url);
    const path = url.pathname;

    // ── HEALTH CHECK ──────────────────────────────────────
    if (path === '/') {
      return json({ ok: true, service: 'TAGRO API', version: '2.0' });
    }

    // ════════════════════════════════════════════════════════
    // STAFF ENDPOINTS
    // ════════════════════════════════════════════════════════

    // GET /staff/list — get all staff from KV
    if (path === '/staff/list' && request.method === 'GET') {
      try {
        let staff = await env.KV.get('staff:all', { type: 'json' });
        if (!staff) {
          // First run — seed from initial data
          staff = INITIAL_STAFF;
          await env.KV.put('staff:all', JSON.stringify(staff));
        }
        return json({ ok: true, staff });
      } catch(e) {
        return err('Failed to load staff: ' + e.message);
      }
    }

    // POST /staff/save — save entire staff list to KV (owner only)
    if (path === '/staff/save' && request.method === 'POST') {
      try {
        const { staff, ownerToken } = await request.json();
        if (ownerToken !== env.OWNER_TOKEN) return err('Unauthorised', 403);
        await env.KV.put('staff:all', JSON.stringify(staff));
        return json({ ok: true });
      } catch(e) {
        return err('Failed to save staff: ' + e.message);
      }
    }

    // POST /staff/update — update single staff member
    if (path === '/staff/update' && request.method === 'POST') {
      try {
        const { staffMember, ownerToken } = await request.json();
        if (ownerToken !== env.OWNER_TOKEN) return err('Unauthorised', 403);
        let staff = await env.KV.get('staff:all', { type: 'json' }) || INITIAL_STAFF;
        const idx = staff.findIndex(s => s.name === staffMember.name && s.branch === staffMember.branch);
        if (idx >= 0) staff[idx] = staffMember;
        else staff.push(staffMember);
        await env.KV.put('staff:all', JSON.stringify(staff));
        return json({ ok: true });
      } catch(e) {
        return err('Failed to update staff: ' + e.message);
      }
    }

    // POST /staff/delete — remove staff member
    if (path === '/staff/delete' && request.method === 'POST') {
      try {
        const { name, branch, ownerToken } = await request.json();
        if (ownerToken !== env.OWNER_TOKEN) return err('Unauthorised', 403);
        let staff = await env.KV.get('staff:all', { type: 'json' }) || INITIAL_STAFF;
        staff = staff.filter(s => !(s.name === name && s.branch === branch));
        await env.KV.put('staff:all', JSON.stringify(staff));
        // Also remove any active device binding
        await env.KV.delete(`device:${name.replace(/\s+/g,'_')}_${branch}`);
        return json({ ok: true });
      } catch(e) {
        return err('Failed to delete staff: ' + e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    // MODELS ENDPOINTS
    // ════════════════════════════════════════════════════════

    // GET /models/list — get all models
    if (path === '/models/list' && request.method === 'GET') {
      try {
        let models = await env.KV.get('models:all', { type: 'json' });
        if (!models) {
          models = INITIAL_MODELS;
          await env.KV.put('models:all', JSON.stringify(models));
        }
        const branch = url.searchParams.get('branch');
        if (branch) {
          return json({ ok: true, models: models.filter(m => m.branches.includes(branch)) });
        }
        return json({ ok: true, models });
      } catch(e) {
        return err('Failed to load models: ' + e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    // DEVICE BINDING ENDPOINTS
    // ════════════════════════════════════════════════════════

    // POST /device/activate
    // Binds a device to a staff member after OTP verification
    // Body: { name, branch, deviceId, deviceInfo }
    if (path === '/device/activate' && request.method === 'POST') {
      try {
        const { name, branch, deviceId, deviceInfo } = await request.json();
        if (!name || !branch || !deviceId) return err('Missing fields');

        // Verify staff exists
        const staff = await env.KV.get('staff:all', { type: 'json' }) || INITIAL_STAFF;
        const member = staff.find(s => s.name === name && s.branch === branch);
        if (!member) return err('Staff member not found');

        const deviceKey = `device:${name.replace(/\s+/g,'_')}_${branch}`;

        // Check if already bound to a different device
        const existing = await env.KV.get(deviceKey, { type: 'json' });
        const isNewDevice = !existing || existing.deviceId !== deviceId;

        // Save new binding
        const binding = {
          name, branch,
          deviceId,
          deviceInfo: deviceInfo || 'Unknown device',
          activatedAt: new Date().toISOString(),
          previousDevice: existing?.deviceId || null
        };
        await env.KV.put(deviceKey, JSON.stringify(binding));

        // Log activation
        await logToKV(env, 'activations', {
          name, branch, deviceId, deviceInfo,
          at: new Date().toISOString(),
          isNewDevice
        });

        // Notify master if new device
        if (isNewDevice) {
          const msg = `TAGRO Alert: ${name} (${branch}) activated a new device. ${deviceInfo || ''}. Time: ${new Date().toLocaleString('en-IN')}`;
          for (const master of MASTERS) {
            if (master.active) {
              await sendSMS(env.FAST2SMS_KEY, master.phone, msg).catch(() => {});
            }
          }
        }

        return json({ ok: true, isNewDevice, member });
      } catch(e) {
        return err('Device activation failed: ' + e.message);
      }
    }

    // POST /device/verify — check if this device is active for this person
    if (path === '/device/verify' && request.method === 'POST') {
      try {
        const { name, branch, deviceId } = await request.json();
        if (!name || !branch || !deviceId) return err('Missing fields');

        const deviceKey = `device:${name.replace(/\s+/g,'_')}_${branch}`;
        const binding = await env.KV.get(deviceKey, { type: 'json' });

        if (!binding) return json({ ok: true, verified: false, reason: 'No device registered' });
        if (binding.deviceId !== deviceId) return json({ ok: true, verified: false, reason: 'Different device registered' });

        return json({ ok: true, verified: true });
      } catch(e) {
        return err('Device verify failed: ' + e.message);
      }
    }

    // POST /staff/phone — get phone for a staff member (for OTP)
    if (path === '/staff/phone' && request.method === 'POST') {
      try {
        const { name, branch } = await request.json();
        if (!name) return err('Missing name');
        const staff = await env.KV.get('staff:all', { type: 'json' }) || INITIAL_STAFF;
        const member = staff.find(s => s.name === name && (!branch || s.branch === branch));
        if (!member) return err('Staff not found');
        // Return masked phone for security
        const phone = member.phone;
        const masked = phone.slice(0,2) + '******' + phone.slice(-2);
        return json({ ok: true, phone: member.phone, masked });
      } catch(e) {
        return err('Failed: ' + e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    // TECH QUERY LOGGING
    // ════════════════════════════════════════════════════════

    // POST /tech/log — log a tech assistant query
    if (path === '/tech/log' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { staffName, branch, model, question, mode, jobId } = body;

        // Check if model is valid for this branch
        const models = await env.KV.get('models:all', { type: 'json' }) || INITIAL_MODELS;
        const modelData = models.find(m => m.id === model);
        const flagged = modelData ? !modelData.branches.includes(branch) : true;

        const entry = {
          id:        Date.now().toString(),
          staffName, branch, model, question, mode,
          jobId:     jobId || null,
          flagged,
          flagReason: flagged ? `${model} not in ${branch} authorised list` : null,
          at:        new Date().toISOString()
        };

        // Save to KV log
        await logToKV(env, 'tech-queries', entry);

        // Save to Dropbox for reports
        try {
          const logPath = `/TAGRO-Service/logs/tech-queries.json`;
          let logs = [];
          const res = await dropboxDownload(env.DROPBOX_TOKEN, logPath);
          if (res.ok) logs = await res.json();
          logs.push(entry);
          // Keep last 1000 entries
          if (logs.length > 1000) logs = logs.slice(-1000);
          await dropboxUpload(env.DROPBOX_TOKEN, logPath, JSON.stringify(logs, null, 2));
        } catch {}

        // Alert master if flagged
        if (flagged) {
          const msg = `TAGRO Flag: ${staffName} (${branch}) queried ${model} — not authorised for this branch. Question: "${question.slice(0,60)}..."`;
          for (const master of MASTERS) {
            if (master.active) {
              await sendSMS(env.FAST2SMS_KEY, master.phone, msg.slice(0,160)).catch(() => {});
            }
          }
        }

        return json({ ok: true, flagged });
      } catch(e) {
        return err('Log failed: ' + e.message);
      }
    }

    // GET /tech/logs — get query logs (owner only)
    if (path === '/tech/logs' && request.method === 'GET') {
      try {
        const token = url.searchParams.get('token');
        if (token !== env.OWNER_TOKEN) return err('Unauthorised', 403);
        const branch = url.searchParams.get('branch');
        const flagged = url.searchParams.get('flagged');

        // Read from Dropbox
        const logPath = `/TAGRO-Service/logs/tech-queries.json`;
        let logs = [];
        try {
          const res = await dropboxDownload(env.DROPBOX_TOKEN, logPath);
          if (res.ok) logs = await res.json();
        } catch {}

        if (branch) logs = logs.filter(l => l.branch === branch);
        if (flagged === '1') logs = logs.filter(l => l.flagged);

        return json({ ok: true, logs: logs.slice(-200) });
      } catch(e) {
        return err('Failed: ' + e.message);
      }
    }

    // POST /staff/models — save a staff member's personal model banner
    if (path === '/staff/models' && request.method === 'POST') {
      try {
        const { name, branch, models } = await request.json();
        if (!name || !branch) return err('Missing fields');
        if (models && models.length > 5) return err('Maximum 5 models allowed');
        const key = `staff-models:${name.replace(/\s+/g,'_')}_${branch}`;
        await env.KV.put(key, JSON.stringify(models || []));
        return json({ ok: true });
      } catch(e) {
        return err('Failed: ' + e.message);
      }
    }

    // GET /staff/models — get a staff member's personal model banner
    if (path === '/staff/models' && request.method === 'GET') {
      try {
        const name   = url.searchParams.get('name');
        const branch = url.searchParams.get('branch');
        if (!name || !branch) return err('Missing fields');
        const key = `staff-models:${name.replace(/\s+/g,'_')}_${branch}`;
        const models = await env.KV.get(key, { type: 'json' }) || [];
        return json({ ok: true, models });
      } catch(e) {
        return err('Failed: ' + e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    // CONFIG ENDPOINTS
    // ════════════════════════════════════════════════════════

    // GET /config/all — load full app config for a device
    if (path === '/config/all' && request.method === 'GET') {
      try {
        const branch = url.searchParams.get('branch');
        const name   = url.searchParams.get('name');

        // Load staff list
        let staff = await env.KV.get('staff:all', { type: 'json' });
        if (!staff) {
          staff = INITIAL_STAFF;
          await env.KV.put('staff:all', JSON.stringify(staff));
        }

        // Load models (filtered by branch if provided)
        let models = await env.KV.get('models:all', { type: 'json' });
        if (!models) {
          models = INITIAL_MODELS;
          await env.KV.put('models:all', JSON.stringify(models));
        }
        const branchModels = branch
          ? models.filter(m => m.branches.includes(branch))
          : models;

        // Load staff member's personal banner if name provided
        let personalModels = [];
        if (name && branch) {
          const key = `staff-models:${name.replace(/\s+/g,'_')}_${branch}`;
          personalModels = await env.KV.get(key, { type: 'json' }) || [];
        }

        return json({
          ok: true,
          staff,
          models,
          branchModels,
          personalModels,
          masters: MASTERS.map(m => ({ name: m.name, active: m.active }))
        });
      } catch(e) {
        return err('Config load failed: ' + e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    // EXISTING SMS ENDPOINTS
    // ════════════════════════════════════════════════════════

    if (path === '/sms/estimate' && request.method === 'POST') {
      const body = await request.json();
      const { phone, workOrder, model, amount, branch } = body;
      if (!phone || !workOrder || !amount) return err('Missing fields');
      const approvalUrl = `https://service.tagro.in/approve?id=${workOrder.replace(/\//g, '')}`;
      const message = `TAGRO Service: Your ${model} estimate is ready. Work Order: ${workOrder}. Amount: Rs.${amount}. Approve: ${approvalUrl}`;
      const result = await sendSMS(env.FAST2SMS_KEY, phone, message);
      return json({ ok: true, result });
    }

    if (path === '/sms/status' && request.method === 'POST') {
      const body = await request.json();
      const { phone, workOrder, model, status, branchPhone } = body;
      if (!phone || !workOrder || !status) return err('Missing fields');
      const message = `TAGRO Service: Update on your ${model}. Work Order: ${workOrder}. Status: ${status}. Query: ${branchPhone || '0475-2253172'}`;
      const result = await sendSMS(env.FAST2SMS_KEY, phone, message);
      return json({ ok: true, result });
    }

    if (path === '/sms/ready' && request.method === 'POST') {
      const body = await request.json();
      const { phone, workOrder, model, invoiceAmount, branchPhone } = body;
      if (!phone || !workOrder) return err('Missing fields');
      const message = `TAGRO Service: Your ${model} is ready. Work Order: ${workOrder}. Invoice: Rs.${invoiceAmount || 'TBD'}. Contact: ${branchPhone || '0475-2253172'}`;
      const result = await sendSMS(env.FAST2SMS_KEY, phone, message);
      return json({ ok: true, result });
    }

    if (path === '/sms/send' && request.method === 'POST') {
      const body = await request.json();
      const { phone, message } = body;
      if (!phone || !message) return err('Missing phone or message');
      if (message.length > 160) return err('Message too long');
      const result = await sendSMS(env.FAST2SMS_KEY, phone, message);
      return json({ ok: true, result });
    }

    // ════════════════════════════════════════════════════════
    // EXISTING DROPBOX ENDPOINTS
    // ════════════════════════════════════════════════════════

    if (path === '/dropbox/save-job' && request.method === 'POST') {
      const body = await request.json();
      const { branch, job } = body;
      if (!branch || !job) return err('Missing branch or job');
      const path_dbx = `/TAGRO-Service/${branch}/jobs.json`;
      let jobs = [];
      try { const res = await dropboxDownload(env.DROPBOX_TOKEN, path_dbx); if (res.ok) jobs = await res.json(); } catch {}
      jobs.push({ ...job, savedAt: new Date().toISOString() });
      await dropboxUpload(env.DROPBOX_TOKEN, path_dbx, JSON.stringify(jobs, null, 2));
      return json({ ok: true, workOrder: job.workOrder });
    }

    if (path === '/dropbox/jobs' && request.method === 'GET') {
      const branch = url.searchParams.get('branch');
      if (!branch) return err('Missing branch');
      const path_dbx = `/TAGRO-Service/${branch}/jobs.json`;
      try {
        const res = await dropboxDownload(env.DROPBOX_TOKEN, path_dbx);
        if (!res.ok) return json({ ok: true, jobs: [] });
        return json({ ok: true, jobs: await res.json() });
      } catch { return json({ ok: true, jobs: [] }); }
    }

    if (path === '/dropbox/save-po' && request.method === 'POST') {
      const body = await request.json();
      const { branch, po } = body;
      if (!branch || !po) return err('Missing branch or po');
      const path_dbx = `/TAGRO-Service/${branch}/po.json`;
      let poList = [];
      try { const res = await dropboxDownload(env.DROPBOX_TOKEN, path_dbx); if (res.ok) poList = await res.json(); } catch {}
      poList.push({ ...po, raisedAt: new Date().toISOString() });
      await dropboxUpload(env.DROPBOX_TOKEN, path_dbx, JSON.stringify(poList, null, 2));
      return json({ ok: true });
    }

    // ════════════════════════════════════════════════════════
    // AI ENDPOINTS
    // ════════════════════════════════════════════════════════

    if (path === '/ai/scan-form' && request.method === 'POST') {
      const body = await request.json();
      const { imageBase64, mediaType } = body;
      if (!imageBase64) return err('Missing image');
      const prompt = `This is a TAGRO service job card. Extract all fields and return ONLY JSON:
{"workOrder":"","date":"","branch":"","customerName":"","phone":"","place":"","model":"","serialNo":"","complaint":"","workDone":"","invoiceAmount":"","confidence":"high|medium|low","notes":""}`;
      try {
        const res = await callClaude(env, [{ role:'user', content:[
          { type:'image', source:{ type:'base64', media_type: mediaType||'image/jpeg', data: imageBase64 } },
          { type:'text', text: prompt }
        ]}], null, 1000);
        const text = res.content?.[0]?.text || '';
        return json({ ok: true, data: JSON.parse(text.replace(/```json|```/g,'').trim()) });
      } catch(e) { return err('AI scan failed: ' + e.message); }
    }

    if (path === '/ai/diagnose' && request.method === 'POST') {
      const body = await request.json();
      const { model, complaint, observations } = body;
      if (!model || !complaint) return err('Missing model or complaint');
      const prompt = `STIHL ${model} complaint: "${complaint}". ${observations||''}
Return ONLY JSON: {"likelyCauses":[],"recommendedChecks":[],"commonParts":[],"estimateRange":"Rs.X to Rs.Y"}`;
      try {
        const res = await callClaude(env, [{ role:'user', content: prompt }], null, 500);
        const text = res.content?.[0]?.text || '';
        return json({ ok: true, data: JSON.parse(text.replace(/```json|```/g,'').trim()) });
      } catch(e) { return err('AI diagnosis failed: ' + e.message); }
    }

    if (path === '/ai/tech-assist' && request.method === 'POST') {
      const body = await request.json();
      const { model, mode, question, history, jobContext } = body;
      if (!question) return err('Missing question');

      const machineModel = model || 'STIHL equipment';
      const modeInstructions = {
        troubleshoot: `Walk through fault diagnosis using the ripple model: most likely cause first, then second, then third. One cause at a time. Format each response as:
PROBLEM: [confirmed symptom]
MOST LIKELY CAUSE: [cause]
CHECK: [specific step]
IF NOT RESOLVED: say so and I will give the next cause.
Reference STIHL service manual sections where applicable.`,
        howto: `Give numbered step-by-step repair instructions. Include tool numbers, torque specs, safety warnings.`,
        parts: `Give part numbers, descriptions, MRP in ₹. Group by assembly section. Use MS 462 India parts list (02/08/2023) for that model.`,
        train: `Explain clearly in simple language. Include how components work, failure causes, prevention. Staff may prefer Malayalam or Tamil.`
      };

      const system = `You are the TAGRO Tech Assistant for TAGRO (Thumpassery Agro), authorized STIHL dealer in Kerala and Tamil Nadu. Branches: KVR-Karavaloor, PKM-Ponkunnam, NDD-Nedumangad, MDM-Marthandam, SKT-Shencottai, OYR-Oyoor, SDM-Sadanandapuram.
Machine: ${machineModel} | Mode: ${mode||'troubleshoot'}
${modeInstructions[mode] || modeInstructions.troubleshoot}
Rules: Be concise. Use ₹ for prices. Mention safety for critical steps. Respond in the language the user writes in — Malayalam, Tamil, or English. Under 300 words unless procedure needs more.`;

      const messages = [];
      if (jobContext && (!history || !history.length)) {
        messages.push({ role:'user', content: `[Job: ${jobContext.model||machineModel}${jobContext.complaint?`, complaint: "${jobContext.complaint}"`:''}${jobContext.jobId?`, WO: ${jobContext.jobId}`:''}]\n\n${question}` });
      } else {
        if (history?.length) messages.push(...history.slice(-10));
        messages.push({ role:'user', content: question });
      }

      try {
        const res = await callClaude(env, messages, system, 1000);
        const answer = res.content?.[0]?.text;
        if (!answer) return err('No response');
        return json({ ok: true, answer });
      } catch(e) { return err('Tech assist failed: ' + e.message); }
    }

    // ════════════════════════════════════════════════════════
    // APPROVAL ENDPOINTS
    // ════════════════════════════════════════════════════════

    if (path === '/approve' && request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return new Response('Invalid link', { status: 400 });
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TAGRO — Estimate Approval</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f5f5f5;padding:24px;min-height:100vh;display:flex;align-items:center;justify-content:center}.card{background:#fff;border-radius:16px;padding:24px;max-width:360px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.08)}.logo{font-size:22px;font-weight:900;font-style:italic;margin-bottom:4px}.logo:before{content:"▰";color:#df6427;font-style:normal;margin-right:4px}h2{font-size:18px;margin:16px 0 8px}p{font-size:14px;color:#666;line-height:1.5;margin-bottom:16px}.wo{font-family:monospace;font-size:13px;color:#999;margin-bottom:20px}.btn{display:block;width:100%;padding:14px;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:10px}.approve{background:#287a3e;color:#fff}.callback{background:#f5f5f5;color:#333;border:1px solid #ddd}.done{text-align:center;padding:20px;display:none}.done h2{color:#287a3e}</style></head>
<body><div class="card"><div class="logo">TAGRO</div><div class="wo">Work Order: ${id}</div><h2>Estimate Ready</h2><p>Your machine estimate is ready. Please approve to begin work or request a callback.</p>
<div id="actions"><button class="btn approve" onclick="respond('approved')">✓ Approve — Begin Work</button><button class="btn callback" onclick="respond('callback')">📞 Request Callback</button></div>
<div class="done" id="done"><h2 id="done-msg">Thank you</h2><p id="done-sub">We will update you shortly.</p></div></div>
<script>async function respond(a){document.getElementById('actions').style.display='none';await fetch('/approve-response',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'${id}',action:a,at:new Date().toISOString()})});document.getElementById('done').style.display='block';document.getElementById('done-msg').textContent=a==='approved'?'Approved. Work begins shortly.':'Callback requested.';document.getElementById('done-sub').textContent=a==='approved'?'We will notify you when ready.':'Our team will contact you soon.';}</script>
</body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    if (path === '/approve-response' && request.method === 'POST') {
      const body = await request.json();
      const { id, action, at } = body;
      const branch = id.slice(0, 3);
      const approvalPath = `/TAGRO-Service/${branch}/approvals.json`;
      let approvals = [];
      try { const res = await dropboxDownload(env.DROPBOX_TOKEN, approvalPath); if (res.ok) approvals = await res.json(); } catch {}
      approvals.push({ workOrderId: id, action, at, recordedAt: new Date().toISOString() });
      await dropboxUpload(env.DROPBOX_TOKEN, approvalPath, JSON.stringify(approvals, null, 2));
      return json({ ok: true });
    }

    return err('Not found', 404);
  }
};

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

async function callClaude(env, messages, system, maxTokens = 1000) {
  const body = { model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages };
  if (system) body.system = system;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key': env.ANTHROPIC_KEY, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function logToKV(env, logType, entry) {
  const key = `log:${logType}:${Date.now()}`;
  await env.KV.put(key, JSON.stringify(entry), { expirationTtl: 60 * 60 * 24 * 90 }); // 90 days
}

async function sendSMS(apiKey, phone, message) {
  const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=q&message=${encodeURIComponent(message)}&language=english&flash=0&numbers=${phone}`;
  const res = await fetch(url);
  return await res.json();
}

async function dropboxDownload(token, path) {
  return fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { Authorization:`Bearer ${token}`, 'Dropbox-API-Arg': JSON.stringify({ path }) }
  });
}

async function dropboxUpload(token, path, content) {
  return fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/octet-stream', 'Dropbox-API-Arg': JSON.stringify({ path, mode:'overwrite', autorename:false }) },
    body: content
  });
}
