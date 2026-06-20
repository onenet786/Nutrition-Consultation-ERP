/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Server, Download, Upload, Shield, Users, HelpCircle, HardDrive, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { AuditLog, User } from '../types';

interface SelfHostedServerTabProps {
  auditLogs: AuditLog[];
  onRefresh: () => void;
  currentUser: User | null;
}

export default function SelfHostedServerTab({ auditLogs, onRefresh, currentUser }: SelfHostedServerTabProps) {
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Selfhosted deployment configurations
  const dockerComposeYaml = `version: '3.8'

services:
  nutrition-erp-backend:
    image: node:20-alpine
    container_name: erp-private-server
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    volumes:
      - ./data:/app/data
      - ./db.json:/app/db.json
    working_dir: /app
    command: npm run start
`;

  const nginxConfig = `server {
    listen 80;
    server_name erp.private.local;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

  const handleBackupDownload = () => {
    window.open('/api/backup', '_blank');
  };

  const handleRestoreUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;

    setUploading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const jsonContent = JSON.parse(evt.target?.result as string);
          const response = await fetch('/api/restore', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser?.id || 'usr-admin'
            },
            body: JSON.stringify(jsonContent)
          });
          const result = await response.json();
          if (result.success) {
            setSuccessMsg('Database restored successfully! All tables and timelines have been reloaded.');
            onRefresh();
          } else {
            setErrorMsg(result.message || 'Verification of backup file integrity failed.');
          }
        } catch (jErr) {
          setErrorMsg('Malformed backup file format. Must be a valid JSON DB state file.');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsText(restoreFile);
    } catch (err: any) {
      setErrorMsg('Error processing file: ' + err.message);
      setUploading(false);
    }
  };

  return (
    <div id="selfhosted-config-tab" className="space-y-6">
      {/* Upper header summary */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-green-500/10 text-green-400 rounded-xl">
                <Server className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold font-display tracking-tight text-white">Private Self-Hosted Server</h2>
                <p className="text-sm text-slate-400">On-premises storage deployment with automatic offline backup operations</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackupDownload}
              id="btn-download-backup"
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 font-medium text-white rounded-xl transition duration-150 cursor-pointer text-sm"
            >
              <Download className="h-4 w-4" />
              Download Full Backup
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/40 p-4 rounded-xl">
            <div className="text-xs text-slate-400">Database Engine</div>
            <div className="text-base font-semibold text-green-400 mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
              Stateful Private File Store (db.json)
            </div>
          </div>
          <div className="bg-slate-800/40 p-4 rounded-xl">
            <div className="text-xs text-slate-400">Encryption Level</div>
            <div className="text-base font-semibold text-slate-200 mt-1">AES-256 (In-Transit & At-Rest Ready)</div>
          </div>
          <div className="bg-slate-800/40 p-4 rounded-xl">
            <div className="text-xs text-slate-400">User Identification System</div>
            <div className="text-base font-semibold text-slate-200 mt-1">Strict Cryptographic Cookie Auth</div>
          </div>
        </div>
      </div>

      {/* Main split: configs & backup-restore tool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left cols: Instructions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-green-600" />
              Self-Host Setup Instructions (Suggested Configuration)
            </h3>
            
            <p className="text-sm text-gray-600 leading-relaxed">
              To guarantee complete data privacy for patients' healthcare data, we recommend self-hosting this platform within your local network or a private virtual cloud instance (e.g., AWS VPC or DigitalOcean VPC). This keeps all dietary plans, personal medical details, and financial reports isolated from third-party networks.
            </p>

            <div className="space-y-4 mt-4">
              <div>
                <span className="text-xs font-bold text-gray-900 uppercase tracking-widest block mb-2">
                  1. Docker Compose Setup (<span className="text-mono font-mono text-[11px] text-green-600">docker-compose.yml</span>)
                </span>
                <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 overflow-x-auto max-h-60 whitespace-pre-wrap leading-relaxed">
                  {dockerComposeYaml}
                </pre>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-900 uppercase tracking-widest block mb-1">
                  2. Reverse Proxy Nginx Configuration
                </span>
                <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 overflow-x-auto max-h-40 whitespace-pre-wrap leading-relaxed">
                  {nginxConfig}
                </pre>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-900 uppercase tracking-widest block mb-1">
                  3. Scheduled Daily Offline Backups (Cron job)
                </span>
                <p className="text-xs text-gray-600 mb-2">Configure a night-time server task to copy the active state and push it to a cold storage box:</p>
                <code className="block p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800">
                  0 2 * * * cp /app/db.json /mnt/secure-backup-vault/db_$(date +\%F).json
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Right col: Backup restore form & Audit log */}
        <div className="space-y-6">
          
          {/* Restore Tool Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-green-600" />
              Restore Database State
            </h3>
            <p className="text-xs text-gray-500">Restore the state using a standard JSON database dump file. Any current records will be overwritten.</p>

            {successMsg && (
              <div className="p-3 bg-green-50 border border-green-100 text-green-800 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRestoreUpload} className="space-y-3">
              <div className="border-2 border-dashed border-gray-200 hover:border-green-400 rounded-xl p-4 text-center cursor-pointer transition">
                <input
                  type="file"
                  id="restore-file-input"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="restore-file-input" className="cursor-pointer block space-y-2">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                  <span className="text-xs font-medium text-gray-600 block">
                    {restoreFile ? restoreFile.name : 'Select or drop .json backup file'}
                  </span>
                  <span className="text-[10px] text-gray-400 block">Maximum size: 20MB</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!restoreFile || uploading}
                id="btn-confirm-restore"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-gray-400 font-medium text-white rounded-xl text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-1"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Validating Integrity...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Over-Write & Restore DB
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Audit Trail quick snapshot */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Security Audit Trails
            </h3>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">{log.userRole}</span>
                    <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-800">{log.action}</div>
                  <div className="text-[10px] text-gray-500 leading-relaxed font-mono">{log.details}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
