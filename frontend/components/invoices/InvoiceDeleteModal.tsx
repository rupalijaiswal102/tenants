import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  invoiceNo: string;
  onConfirm: () => void;
  onCancel:  () => void;
}

export function InvoiceDeleteModal({ invoiceNo, onConfirm, onCancel }: Props) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{scale:0.95}} animate={{scale:1}} exit={{scale:0.95}}
        className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 size={32}/>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Delete Invoice?</h2>
        <p className="text-slate-500 mb-8">
          Are you sure you want to delete invoice{' '}
          <span className="font-mono font-bold text-slate-700">#{invoiceNo}</span>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-md">Delete</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
