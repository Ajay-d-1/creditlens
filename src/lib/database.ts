import { supabase } from './supabase';
import { AuditResult } from './audit-engine';

export interface AuditRecord {
  id?: string;
  created_at?: string;
  tools_data: any[];
  total_spend: number;
  total_savings: number;
  findings: any[];
  email?: string;
  company_name?: string;
  role?: string;
  team_size: number;
  use_case: string;
  share_id: string;
}

export function generateShareId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(2, 6);
}

export async function saveAudit(auditData: AuditRecord) {
  const { data, error } = await supabase
    .from('audits')
    .insert([auditData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getAuditByShareId(shareId: string) {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('share_id', shareId)
    .single();
  
  if (error) throw error;
  return data;
}
