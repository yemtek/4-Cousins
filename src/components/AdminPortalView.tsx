import React, { useState } from 'react';
import {
  Upload,
  Trash2,
  Edit2,
  ShieldCheck,
  Receipt,
  LogOut,
  Calendar,
  Clock,
  DollarSign,
  User,
  Search,
  Plus,
  Coins,
  Tags,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  FileText,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Contribution, Disbursement, AppSettings } from '../types';
import {
  deleteContribution,
  updateContribution,
  addDisbursement,
  deleteDisbursement,
  updateAppSettings,
  clearAllDemoData,
} from '../contributionService';

interface AdminPortalViewProps {
  contributions: Contribution[];
  disbursements: Disbursement[];
  settings: AppSettings;
  onOpenReceiptScanner: () => void;
  onLogout: () => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  contributions,
  disbursements,
  settings,
  onOpenReceiptScanner,
  onLogout,
}) => {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'contributions' | 'disbursements' | 'settings'>('contributions');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Contribution | null>(null);
  const [inspectImage, setInspectImage] = useState<string | null>(null);

  // Custom in-app confirmation modal state for deletion
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: string;
    type: 'contribution' | 'disbursement';
    title: string;
  } | null>(null);

  // Fund Removal (Disbursement) Form State
  const [showDisbursementModal, setShowDisbursementModal] = useState(false);
  const [disbursementAmount, setDisbursementAmount] = useState<number | string>('');
  const [disbursementCurrency, setDisbursementCurrency] = useState(settings.primaryCurrency || 'NGN');
  const [disbursementRecipient, setDisbursementRecipient] = useState('');
  const [disbursementCategory, setDisbursementCategory] = useState(settings.categories[0] || 'Family Project');
  const [disbursementReason, setDisbursementReason] = useState('');
  const [disbursementDate, setDisbursementDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [disbursementRef, setDisbursementRef] = useState('');
  const [isSubmittingDisbursement, setIsSubmittingDisbursement] = useState(false);

  // Settings: Category Editor State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState('');

  const filteredContributions = contributions.filter(
    (c) =>
      c.contributorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    const { id, type } = deleteConfirmation;
    setDeletingId(id);
    try {
      if (id === 'all_demo_data') {
        await clearAllDemoData();
      } else if (type === 'contribution') {
        await deleteContribution(id);
      } else {
        await deleteDisbursement(id);
      }
      setDeleteConfirmation(null);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete entry from database. Please check your connection.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.id) return;
    try {
      await updateContribution(editingItem.id, {
        contributorName: editingItem.contributorName,
        amount: Number(editingItem.amount),
        currency: editingItem.currency,
        date: editingItem.date,
        time: editingItem.time,
        category: editingItem.category,
        paymentMethod: editingItem.paymentMethod,
        referenceNumber: editingItem.referenceNumber,
        receiptNote: editingItem.receiptNote,
      });
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to update contribution:', err);
    }
  };

  const handleDisbursementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(disbursementAmount);
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid disbursement amount.');
      return;
    }
    if (!disbursementReason.trim()) {
      alert('Please state the specific reason for removing funds.');
      return;
    }

    setIsSubmittingDisbursement(true);
    try {
      const now = new Date();
      await addDisbursement({
        amount: num,
        currency: disbursementCurrency,
        recipientName: disbursementRecipient.trim() || 'Family Vendor/Member',
        category: disbursementCategory,
        reason: disbursementReason.trim(),
        approvedByAdmin: 'Family Admin',
        date: disbursementDate,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        referenceNumber: disbursementRef.trim(),
      });

      setShowDisbursementModal(false);
      setDisbursementAmount('');
      setDisbursementReason('');
      setDisbursementRecipient('');
      setDisbursementRef('');
    } catch (err) {
      console.error('Failed to record fund removal:', err);
    } finally {
      setIsSubmittingDisbursement(false);
    }
  };

  // Currency Switch Handler
  const handleCurrencyChange = async (newCurr: string) => {
    try {
      await updateAppSettings({ primaryCurrency: newCurr });
      setSettingsSuccessMessage(`Primary currency updated to ${newCurr}.`);
      setTimeout(() => setSettingsSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to change currency:', err);
    }
  };

  // Add Category Handler
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = newCategoryName.trim();
    if (!cat) return;
    if (settings.categories.includes(cat)) {
      alert('This category already exists.');
      return;
    }
    const updated = [...settings.categories, cat];
    try {
      await updateAppSettings({ categories: updated });
      setNewCategoryName('');
      setSettingsSuccessMessage(`Added "${cat}" category.`);
      setTimeout(() => setSettingsSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  // Remove Category Handler
  const handleRemoveCategory = async (catToRemove: string) => {
    if (settings.categories.length <= 1) {
      alert('You must keep at least one category.');
      return;
    }
    const updated = settings.categories.filter((c) => c !== catToRemove);
    try {
      await updateAppSettings({ categories: updated });
    } catch (err) {
      console.error('Failed to remove category:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Action Hero Banner */}
      <div className="bg-gradient-to-r from-amber-800 via-stone-900 to-amber-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold tracking-wide border border-amber-500/30">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              Treasurer & Coordinator Mode Active
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif-display text-white">
              Admin Control Center
            </h2>
            <p className="text-sm text-amber-100/80 leading-relaxed">
              Upload verified payment receipts, switch primary currency, manage contribution types,
              or record authorized fund disbursements with reasons broadcasted to all family members.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenReceiptScanner}
              className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold px-4 py-2.5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              <Upload className="w-4 h-4 text-stone-950" />
              <span>Upload & Scan Slip</span>
            </button>

            <button
              onClick={() => setShowDisbursementModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-2xl shadow-lg transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              <TrendingDown className="w-4 h-4" />
              <span>Remove / Disburse Fund</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs sm:text-sm font-semibold transition border border-white/15 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Lock Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setActiveAdminSubTab('contributions')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeAdminSubTab === 'contributions'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Contributions ({contributions.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('disbursements')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeAdminSubTab === 'disbursements'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Fund Disbursements ({disbursements.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeAdminSubTab === 'settings'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Currency & Categories</span>
        </button>
      </div>

      {/* SUB-TAB 1: CONTRIBUTIONS TABLE */}
      {activeAdminSubTab === 'contributions' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-serif-display">
                Contribution Slips & Entries
              </h3>
              <p className="text-xs text-stone-500">
                Payment receipts are hashed to prevent duplicate uploads.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search contributor, session ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {filteredContributions.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Receipt className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-700 font-semibold">No contributions match your query</p>
              <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">
                Upload bank slips or screenshots with the button above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 sm:mx-0 mt-2">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Contributor</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Channel / Ref</th>
                    <th className="py-3 px-4">Slip Proof</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {filteredContributions.map((item) => (
                    <tr key={item.id} className="hover:bg-amber-50/40 transition">
                      <td className="py-3.5 px-4 font-semibold text-stone-900">
                        {item.contributorName}
                        {item.category && (
                          <span className="block text-[11px] font-normal text-stone-500">
                            {item.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {item.currency === 'NGN' ? '₦' : item.currency} {Number(item.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-stone-800">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {item.date}
                        </div>
                        {item.time && (
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-medium text-[11px]">
                          {item.paymentMethod || 'Transfer'}
                        </span>
                        {item.referenceNumber && (
                          <span className="block text-[11px] font-mono text-stone-400 mt-0.5">
                            {item.referenceNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.receiptImageUrl ? (
                          <button
                            type="button"
                            onClick={() => setInspectImage(item.receiptImageUrl || null)}
                            className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-semibold underline decoration-amber-300 underline-offset-2 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" /> View Slip
                          </button>
                        ) : (
                          <span className="text-[11px] text-stone-400 italic">No image</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-stone-600 hover:text-amber-800 hover:bg-amber-100/70 rounded-lg transition cursor-pointer"
                            title="Edit Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (item.id) {
                                setDeleteConfirmation({
                                  id: item.id,
                                  type: 'contribution',
                                  title: `${item.contributorName} (${item.currency} ${Number(item.amount).toLocaleString()})`,
                                });
                              }
                            }}
                            className="p-1.5 text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete Contribution"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: DISBURSEMENTS (FUND REMOVAL) */}
      {activeAdminSubTab === 'disbursements' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-serif-display flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                Fund Disbursements & Expenditures
              </h3>
              <p className="text-xs text-stone-500">
                Authorized fund removals are fully transparent and automatically broadcasted to all family members.
              </p>
            </div>
            <button
              onClick={() => setShowDisbursementModal(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Removal</span>
            </button>
          </div>

          {disbursements.length === 0 ? (
            <div className="text-center py-16">
              <TrendingDown className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-700 font-semibold">No Fund Removals Recorded</p>
              <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">
                When the family uses funds for land, medical, celebration, or project costs, log them here with reasons.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 sm:mx-0 mt-2">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-rose-50/60 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Amount Removed</th>
                    <th className="py-3 px-4">Recipient / Vendor</th>
                    <th className="py-3 px-4">Purpose / Stated Reason</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {disbursements.map((d) => (
                    <tr key={d.id} className="hover:bg-rose-50/30 transition">
                      <td className="py-3.5 px-4 font-bold text-rose-700 text-sm font-mono">
                        - {d.currency === 'NGN' ? '₦' : d.currency} {Number(d.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-stone-900">
                        {d.recipientName}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-medium text-stone-800 block">
                          "{d.reason}"
                        </span>
                        {d.referenceNumber && (
                          <span className="text-[11px] font-mono text-stone-400">
                            Ref: {d.referenceNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">
                          {d.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-600">
                        {d.date} {d.time && `• ${d.time}`}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (d.id) {
                              setDeleteConfirmation({
                                id: d.id,
                                type: 'disbursement',
                                title: `Disbursement of ${d.currency} ${Number(d.amount).toLocaleString()} to ${d.recipientName}`,
                              });
                            }
                          }}
                          className="p-1.5 text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Delete Disbursement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: CURRENCY & CATEGORY SETTINGS */}
      {activeAdminSubTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Currency Setting */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 font-serif-display">
                  Primary Ledger Currency
                </h3>
                <p className="text-xs text-stone-500">
                  Switch the default currency displayed on the Public Dashboard & metrics.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { code: 'NGN', name: 'Nigerian Naira (₦)', desc: 'Primary' },
                  { code: 'USD', name: 'US Dollar ($)', desc: 'Global' },
                  { code: 'GBP', name: 'British Pound (£)', desc: 'UK' },
                  { code: 'EUR', name: 'Euro (€)', desc: 'Europe' },
                  { code: 'KES', name: 'Kenyan Shilling (KSh)', desc: 'East Africa' },
                  { code: 'CAD', name: 'Canadian Dollar (C$)', desc: 'Canada' },
                ].map((curr) => (
                  <button
                    key={curr.code}
                    onClick={() => handleCurrencyChange(curr.code)}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      settings.primaryCurrency === curr.code
                        ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-bold ring-2 ring-amber-500/20'
                        : 'border-stone-200 hover:border-amber-400 bg-stone-50/50'
                    }`}
                  >
                    <span className="block text-sm font-bold">{curr.code}</span>
                    <span className="block text-[11px] text-stone-500 mt-0.5 truncate">
                      {curr.name}
                    </span>
                  </button>
                ))}
              </div>

              {settingsSuccessMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2 border border-emerald-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{settingsSuccessMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Categories Management */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Tags className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 font-serif-display">
                  Contribution Categories
                </h3>
                <p className="text-xs text-stone-500">
                  Create, view, and customize contribution types for the family fund.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input
                type="text"
                required
                placeholder="New Category (e.g. Wedding Gift)..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {settings.categories.map((cat) => (
                <div
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 text-xs font-medium border border-stone-200"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat)}
                    className="text-stone-400 hover:text-red-600 p-0.5 cursor-pointer"
                    title="Remove category"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Production Reset Button */}
            <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-400">Database Clean Reset</span>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmation({
                    id: 'all_demo_data',
                    type: 'contribution',
                    title: 'ALL demo contributions, disbursements, and notification records across the database',
                  });
                }}
                className="text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wipe All Demo Records</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM IN-APP DELETE CONFIRMATION MODAL */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif-display text-stone-900">
                  Confirm Deletion
                </h3>
                <p className="text-xs text-stone-500">
                  This record will be permanently deleted from the cloud database.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 mb-5 text-xs text-stone-700">
              <p className="font-semibold text-stone-900">
                {deleteConfirmation.title}
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                disabled={Boolean(deletingId)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-700 text-xs sm:text-sm font-semibold hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deletingId ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISBURSEMENT / FUND REMOVAL MODAL */}
      {showDisbursementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-display text-stone-900">
                    Record Fund Removal / Disbursement
                  </h3>
                  <p className="text-xs text-stone-500">
                    Notifies all family members on web & mobile automatically.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDisbursementModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisbursementSubmit} className="space-y-3.5">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-7">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Amount to Remove *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={disbursementAmount}
                    onChange={(e) => setDisbursementAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="col-span-5">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={disbursementCurrency}
                    onChange={(e) => setDisbursementCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-semibold focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="NGN">NGN (₦)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="KES">KES (KSh)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Recipient / Beneficiary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Uncle John (Hospital Bill), Surveyor Adeleke"
                  value={disbursementRecipient}
                  onChange={(e) => setDisbursementRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Detailed Reason for Removal *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="State the transparent justification for withdrawing this family fund..."
                  value={disbursementReason}
                  onChange={(e) => setDisbursementReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category
                  </label>
                  <select
                    value={disbursementCategory}
                    onChange={(e) => setDisbursementCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:ring-2 focus:ring-rose-500"
                  >
                    {settings.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Invoice / Transfer Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-901"
                  value={disbursementRef}
                  onChange={(e) => setDisbursementRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDisbursementModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs sm:text-sm hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDisbursement}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingDisbursement ? 'Broadcasting...' : 'Confirm & Disburse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTRIBUTION MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in">
            <h3 className="text-xl font-bold font-serif-display text-stone-900 mb-4">
              Edit Contribution Entry
            </h3>
            <form onSubmit={handleUpdate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Contributor Name
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.contributorName}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, contributorName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingItem.amount}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, amount: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-bold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={editingItem.currency}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, currency: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editingItem.category || settings.categories[0]}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    {settings.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editingItem.date}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT RECEIPT SLIP MODAL */}
      {inspectImage && (
        <div
          onClick={() => setInspectImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                Original Verified Transaction Slip
              </span>
              <button
                onClick={() => setInspectImage(null)}
                className="text-stone-400 hover:text-stone-800 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={inspectImage}
              alt="Receipt details"
              className="max-h-[75vh] w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
