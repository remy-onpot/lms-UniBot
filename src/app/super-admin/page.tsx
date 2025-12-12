'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Users, TrendingUp, CheckCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function SuperAdminPage() {
  const [stats, setStats] = useState({ users: 0, universities: 0, revenue: 0 });
  const [leads, setLeads] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Stats
    const { count: users } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: unis } = await supabase.from('universities').select('*', { count: 'exact', head: true });
    
    // 2. Leads (Grouped by Custom Name)
    const { data: rawLeads } = await supabase.from('users').select('custom_university').not('custom_university', 'is', null);
    
    // Aggregate Leads
    const leadMap = new Map();
    rawLeads?.forEach((l: any) => {
      const name = l.custom_university.trim();
      leadMap.set(name, (leadMap.get(name) || 0) + 1);
    });
    const sortedLeads = Array.from(leadMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a: any, b: any) => b.count - a.count);

    // 3. Official Unis
    const { data: officialUnis } = await supabase.from('universities').select('*').order('name');

    setStats({ users: users || 0, universities: unis || 0, revenue: 0 }); // Revenue logic later
    setLeads(sortedLeads);
    setUniversities(officialUnis || []);
  };

  const handleOfficialise = async (name: string) => {
    const abbr = name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 4);
    const subdomain = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);

    if(!confirm(`Add "${name}" as official university? Subdomain: ${subdomain}`)) return;

    // 1. Add to Table
    const { data: newUni, error } = await supabase.from('universities').insert([{
      name,
      abbreviation: abbr,
      subdomain,
      is_active: true
    }]).select().single();

    if (error) return toast.error(error.message);

    // 2. Migrate Users
    const { error: updateError } = await supabase
      .from('users')
      .update({ university_id: newUni.id, custom_university: null })
      .eq('custom_university', name);

    if (!updateError) {
      toast.success(`${name} Officialised!`, { description: "Users migrated successfully." });
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-900">Super Admin</h1>
          <p className="text-slate-500">Platform Overview & Expansion Control</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-6">
           <StatCard label="Total Users" value={stats.users} icon={Users} color="blue" />
           <StatCard label="Universities" value={stats.universities} icon={Building2} color="indigo" />
           <StatCard label="Est. Revenue" value="₵0.00" icon={TrendingUp} color="green" />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* 🚀 LEAD GENERATION ENGINE */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              🔥 Expansion Leads
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">Hot</span>
            </h3>
            <div className="overflow-y-auto max-h-[400px] space-y-2">
              {leads.map((lead, i) => (
                <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xs text-slate-500">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{lead.name}</p>
                      <p className="text-xs text-slate-400">{lead.count} students waiting</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleOfficialise(lead.name)} className="bg-slate-900 text-xs h-8">
                    + Officialise
                  </Button>
                </div>
              ))}
              {leads.length === 0 && <p className="text-center text-slate-400 py-8">No leads yet.</p>}
            </div>
          </div>

          {/* 🏛️ OFFICIAL UNIVERSITIES */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Official Partners</h3>
              <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1"/> Add New</Button>
            </div>
            <div className="overflow-y-auto max-h-[400px] grid gap-2">
               {universities.map(uni => (
                 <div key={uni.id} className="flex items-center gap-3 p-3 border rounded-xl">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center font-bold text-indigo-700 text-xs">
                       {uni.abbreviation}
                    </div>
                    <div>
                       <p className="font-bold text-sm text-slate-900">{uni.name}</p>
                       <p className="text-xs text-slate-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500"/> Active
                          <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"/>
                          {uni.subdomain}.unibot.com
                       </p>
                    </div>
                 </div>
               ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = { blue: "bg-blue-50 text-blue-600", indigo: "bg-indigo-50 text-indigo-600", green: "bg-green-50 text-green-600" };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
       <div className={`p-4 rounded-xl ${colors[color]}`}><Icon className="w-6 h-6" /></div>
       <div>
         <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</p>
         <h3 className="text-2xl font-black text-slate-900">{value}</h3>
       </div>
    </div>
  );
}