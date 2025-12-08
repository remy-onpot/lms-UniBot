// src/components/features/profile/EditProfileTab.tsx
import { User, Edit2, Save, X, Phone, Mail } from 'lucide-react';

interface EditProfileTabProps {
  formData: any;
  editMode: Record<string, boolean>;
  onChange: (field: string, value: string) => void;
  onEdit: (field: string) => void;
  onSave: (field: string) => void;
  onCancel: (field: string) => void;
}

export function EditProfileTab({ formData, editMode, onChange, onEdit, onSave, onCancel }: EditProfileTabProps) {
  
  const renderField = (field: string, label: string, icon?: any, isTextArea = false) => (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
       <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
             {icon}
             <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
          </div>
          {editMode[field] ? (
             <div className="flex gap-2">
                <button onClick={() => onCancel(field)} className="text-red-500 p-1 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                <button onClick={() => onSave(field)} className="text-green-600 p-1 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
             </div>
          ) : (
             <button onClick={() => onEdit(field)} className="text-indigo-600 p-1 hover:bg-indigo-50 rounded"><Edit2 className="w-4 h-4" /></button>
          )}
       </div>
       {editMode[field] ? (
          isTextArea ? (
            <textarea 
              value={formData[field]} 
              onChange={e => onChange(field, e.target.value)} 
              className="w-full bg-white p-3 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none min-h-[100px] resize-none text-slate-900" 
            />
          ) : (
            <input 
              value={formData[field]} 
              onChange={e => onChange(field, e.target.value)} 
              className="w-full bg-white p-3 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-slate-900" 
            />
          )
       ) : (
          <p className={`text-lg ${field === 'bio' ? 'text-slate-600 text-base leading-relaxed' : 'font-bold text-slate-900'}`}>
            {formData[field] || (field === 'bio' ? 'Tell us about yourself...' : 'Not Set')}
          </p>
       )}
    </div>
  );

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <User className="w-6 h-6 text-indigo-600" /> Personal Information
       </h3>
       
       {renderField('full_name', 'Full Name')}
       {renderField('phone_number', 'Phone Number', <Phone className="w-3 h-3 text-slate-400" />)}
       {renderField('bio', 'Bio', null, true)}

       <div className="p-4 rounded-2xl border border-slate-100 flex items-center gap-4 opacity-70">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
             <Mail className="w-5 h-5" />
          </div>
          <div>
             <p className="text-xs font-bold text-slate-400 uppercase">Email Address</p>
             <p className="text-slate-700 font-mono text-sm">{formData.email}</p>
          </div>
       </div>
    </div>
  );
}