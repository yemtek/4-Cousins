import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  Heart,
  Share2,
  CheckCircle,
  Receipt,
  Download,
  TrendingDown,
  AlertCircle,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { Contribution, Disbursement, AppSettings } from '../types';

interface PublicDashboardProps {
  contributions: Contribution[];
  disbursements: Disbursement[];
  settings: AppSettings;
  isLoading: boolean;
  onOpenAdmin: () => void;
}

export const PublicDashboard: React.FC<PublicDashboardProps> = ({
  contributions,
  disbursements,
  settings,
  isLoading,
  onOpenAdmin,
}) => {
  const [activeLedgerTab, setActiveLedgerTab] = useState<'contributions' | 'disbursements'>('contributions');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [copiedLink, setCopiedLink] = useState(false);
  const [inspectReceiptUrl, setInspectReceiptUrl] = useState<string | null>(null);

  // Group metrics
  const totalContributions = useMemo(() => {
    return contributions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [contributions]);

  const totalDisbursed = useMemo(() => {
    return disbursements.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [disbursements]);

  const netBalance = totalContributions - totalDisbursed;

  const uniqueContributorsCount = useMemo(() => {
    const names = new Set(
      contributions.map((c) => c.contributorName.trim().toLowerCase()).filter(Boolean)
    );
    return names.size;
  }, [contributions]);

  const displayCurrency = settings.primaryCurrency || 'NGN';

  // Categories list from settings & contributions
  const categories = useMemo(() => {
    const cats = new Set<string>(settings.categories || []);
    contributions.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats);
  }, [contributions, settings.categories]);

  // Filtered and sorted contributions
  const filteredContributions = useMemo(() => {
    let result = contributions.filter((c) => {
      const matchSearch =
        c.contributorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.paymentMethod && c.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.referenceNumber && c.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.receiptNote && c.receiptNote.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat =
        selectedCategory === 'all' || c.category?.toLowerCase() === selectedCategory.toLowerCase();

      return matchSearch && matchCat;
    });

    if (sortOrder === 'asc') {
      result = [...result].reverse();
    }

    return result;
  }, [contributions, searchTerm, selectedCategory, sortOrder]);

  // Filtered disbursements
  const filteredDisbursements = useMemo(() => {
    return disbursements.filter((d) => {
      return (
        d.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [disbursements, searchTerm]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleExportCSV = () => {
    if (contributions.length === 0) return;
    const headers = [
      'Contributor Name',
      'Amount',
      'Currency',
      'Date',
      'Time',
      'Category',
      'Payment Method',
      'Reference No',
    ];
    const rows = contributions.map((c) => [
      `"${c.contributorName.replace(/"/g, '""')}"`,
      c.amount,
      c.currency,
      c.date,
      c.time,
      `"${(c.category || '').replace(/"/g, '""')}"`,
      `"${(c.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(c.referenceNumber || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `4_Cousins_Togetherness_Ledger_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Summary Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-900 via-stone-900 to-amber-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold tracking-wide border border-amber-400/30">
              <Heart className="w-3.5 h-3.5 fill-amber-300" />
              Official Family Financial Ledger • Nigeria & Diaspora
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif-display tracking-tight text-white leading-tight">
              4 Cousins Togetherness
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Transparent, real-time tracking of family financial contributions and disbursements.
              Every bank slip and mobile money transfer is verified with Gemini AI to protect unity and trust.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>Share Public Link</span>
                  </>
                )}
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Prominent Summary Metric Card */}
          <div className="w-full lg:w-96 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-amber-200/90 font-bold block mb-1">
                  Net Available Family Fund
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {displayCurrency}
                </span>
              </div>

              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-serif-display text-white tracking-tight py-1 font-mono">
                {displayCurrency === 'NGN' ? '₦' : displayCurrency}{' '}
                {isLoading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  netBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })
                )}
              </div>
              <p className="text-[11px] text-amber-100/70 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Real-time cloud sync active
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-white/15 text-xs">
              <div>
                <span className="text-stone-300 block text-[11px]">Total Raised</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  +{displayCurrency === 'NGN' ? '₦' : displayCurrency} {totalContributions.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-stone-300 block text-[11px]">Disbursed</span>
                <span className="text-sm font-bold text-rose-300 font-mono">
                  -{displayCurrency === 'NGN' ? '₦' : displayCurrency} {totalDisbursed.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disbursed Fund Transparency Banner (If any disbursements occurred) */}
      {disbursements.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <TrendingDown className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <strong className="font-bold text-amber-950">
                Notice of Fund Removals:
              </strong>{' '}
              <span>
                {disbursements.length} authorized disbursement(s) totaling{' '}
                <strong className="font-mono">{displayCurrency} {totalDisbursed.toLocaleString()}</strong> have been released for family initiatives.
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveLedgerTab('disbursements')}
            className="text-amber-800 font-bold hover:underline shrink-0 text-left sm:text-right"
          >
            Review Disbursed Details →
          </button>
        </div>
      )}

      {/* Structured Ledger Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200">
        {/* Ledger View Tabs & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveLedgerTab('contributions')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeLedgerTab === 'contributions'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Contributions ({contributions.length})</span>
            </button>

            <button
              onClick={() => setActiveLedgerTab('disbursements')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeLedgerTab === 'disbursements'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Disbursements ({disbursements.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeLedgerTab === 'contributions'
                    ? 'Search contributor...'
                    : 'Search recipient, purpose...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Category Filter */}
            {categories.length > 0 && activeLedgerTab === 'contributions' && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs sm:text-sm py-2 px-3 rounded-xl border border-stone-200 bg-stone-50 font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Types</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center gap-1 text-xs sm:text-sm py-2 px-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 font-medium text-stone-700 transition"
              title="Toggle Date Ordering"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
              <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: CONTRIBUTIONS VIEW */}
        {activeLedgerTab === 'contributions' && (
          <div>
            {isLoading ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-stone-600">Loading family ledger...</p>
              </div>
            ) : filteredContributions.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <Receipt className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-stone-800">No Contributions Found</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                  {searchTerm
                    ? 'No records match your search criteria.'
                    : 'No contributions recorded yet in the family cloud database.'}
                </p>
                <button
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition shadow-xs"
                >
                  Access Admin Portal to Add Slip
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 sm:mx-0 mt-3">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-stone-50/80 text-stone-600 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                    <tr>
                      <th className="py-3.5 px-4">Contributor Name</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Time</th>
                      <th className="py-3.5 px-4 hidden md:table-cell">Channel & Ref</th>
                      <th className="py-3.5 px-4 text-center">Verification Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {filteredContributions.map((item, index) => (
                      <tr
                        key={item.id || index}
                        className="hover:bg-amber-50/30 transition-colors group"
                      >
                        <td className="py-4 px-4">
                          <div className="font-bold text-stone-900 text-sm sm:text-base">
                            {item.contributorName}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                            <span className="font-medium text-amber-800/90 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                              {item.category || 'Monthly Family Dues'}
                            </span>
                            {item.receiptNote && (
                              <span className="truncate max-w-[200px] italic">
                                “{item.receiptNote}”
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="text-base sm:text-lg font-extrabold text-emerald-800 font-mono">
                            {item.currency === 'NGN' ? '₦' : item.currency}{' '}
                            {Number(item.amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-stone-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>{item.date || '—'}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-stone-600">
                          <div className="flex items-center gap-1.5 text-xs font-mono">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{item.time || '—'}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 hidden md:table-cell">
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 font-semibold text-xs">
                            {item.paymentMethod || 'Bank Wire'}
                          </span>
                          {item.referenceNumber && (
                            <span className="block font-mono text-[11px] text-stone-400 mt-0.5">
                              Ref: {item.referenceNumber}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {item.receiptImageUrl ? (
                            <button
                              type="button"
                              onClick={() => setInspectReceiptUrl(item.receiptImageUrl || null)}
                              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-semibold px-2 py-1 rounded-lg hover:bg-amber-100/50 transition cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>View Slip</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Slip Verified
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DISBURSEMENTS (FUND REMOVAL TRANSPARENCY) */}
        {activeLedgerTab === 'disbursements' && (
          <div>
            {filteredDisbursements.length === 0 ? (
              <div className="py-16 text-center">
                <TrendingDown className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-stone-800">
                  No Fund Removals Recorded
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  100% of family funds remain in the treasury. Whenever money is used, administrators log the full reason here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 sm:mx-0 mt-3">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-rose-50/60 text-stone-600 font-semibold uppercase tracking-wider text-[11px] border-b border-stone-200">
                    <tr>
                      <th className="py-3.5 px-4">Amount Disbursed</th>
                      <th className="py-3.5 px-4">Beneficiary / Recipient</th>
                      <th className="py-3.5 px-4">Stated Purpose / Reason</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {filteredDisbursements.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-rose-50/30 transition">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-base sm:text-lg font-bold text-rose-700 font-mono">
                            - {item.currency === 'NGN' ? '₦' : item.currency}{' '}
                            {Number(item.amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-bold text-stone-900">
                          {item.recipientName}
                        </td>

                        <td className="py-4 px-4 max-w-sm">
                          <span className="text-stone-800 font-medium block">
                            "{item.reason}"
                          </span>
                          {item.referenceNumber && (
                            <span className="text-[11px] font-mono text-stone-400 mt-0.5 block">
                              Ref: {item.referenceNumber}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">
                            {item.category}
                          </span>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap text-stone-600 font-medium">
                          {item.date} {item.time && `• ${item.time}`}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Approved
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slip Image Dialog */}
      {inspectReceiptUrl && (
        <div
          onClick={() => setInspectReceiptUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                Uploaded Verification Receipt
              </span>
              <button
                onClick={() => setInspectReceiptUrl(null)}
                className="text-stone-400 hover:text-stone-800 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <img
              src={inspectReceiptUrl}
              alt="Receipt"
              className="max-h-[75vh] w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
