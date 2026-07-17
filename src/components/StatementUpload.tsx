'use client';

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileText, Check, AlertCircle, Shield, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import { detectColumns, parseAmount, parseDateToMonth } from '@/engine/csvParser';
import { normalizeMerchant, matchVendor } from '@/engine/vendorMatcher';
import { aggregateTransactions } from '@/engine/aggregate';
import type { ColumnMapping, ParsedTransaction, AggregationResult, VendorMatch } from '@/engine/types';

interface StatementUploadProps {
  onComplete: (result: AggregationResult) => void;
}

type UploadStep = 'upload' | 'mapping' | 'preview' | 'done';

export function StatementUpload({ onComplete }: StatementUploadProps) {
  const [step, setStep] = useState<UploadStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [aggregation, setAggregation] = useState<AggregationResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── CSV Processing ──

  const processCSV = useCallback((file: File) => {
    setError('');
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError('Could not parse CSV. Check the file format.');
          return;
        }

        const data = results.data as Record<string, string>[];
        if (data.length === 0) {
          setError('CSV file appears to be empty.');
          return;
        }

        const csvHeaders = Object.keys(data[0]);
        setHeaders(csvHeaders);
        setRawRows(data);

        // Try auto-detection
        const detected = detectColumns(csvHeaders);
        if (detected) {
          setMapping(detected);
          applyMapping(data, detected);
          setStep('preview');
        } else {
          // Show column mapping UI
          setMapping({
            date: csvHeaders[0] || '',
            description: csvHeaders[1] || '',
            amount: csvHeaders[2] || '',
          });
          setStep('mapping');
        }
      },
      error: () => {
        setError('Failed to read the CSV file.');
      },
    });
  }, []);

  const applyMapping = useCallback(
    (rows: Record<string, string>[], columnMapping: ColumnMapping) => {
      const transactions: ParsedTransaction[] = rows
        .map((row) => {
          const dateRaw = row[columnMapping.date] || '';
          const descRaw = row[columnMapping.description] || '';
          const amountRaw = row[columnMapping.amount] || '';

          const amount = parseAmount(amountRaw);
          if (amount === 0 || !descRaw.trim()) return null;

          return {
            date: dateRaw,
            description: descRaw,
            amount,
            rawRow: row,
          } satisfies ParsedTransaction;
        })
        .filter((t): t is ParsedTransaction => t !== null);

      setParsedTransactions(transactions);

      // Run aggregation with full normalize + match pipeline
      const result = aggregateTransactions(transactions, (desc) => {
        const normalized = normalizeMerchant(desc);
        return matchVendor(normalized);
      });
      setAggregation(result);
    },
    []
  );

  // ── Drag & Drop ──

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
        processCSV(file);
      } else {
        setError('Please drop a CSV file.');
      }
    },
    [processCSV]
  );

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processCSV(file);
    },
    [processCSV]
  );

  // ── Column Mapping Confirm ──

  const handleMappingConfirm = useCallback(() => {
    if (!mapping) return;
    applyMapping(rawRows, mapping);
    setStep('preview');
  }, [mapping, rawRows, applyMapping]);

  // ── Confirm & Send to Parent ──

  const handleConfirm = useCallback(() => {
    if (aggregation) {
      setStep('done');
      onComplete(aggregation);
    }
  }, [aggregation, onComplete]);

  // ── Preview Table Helper ──

  function getVendorPreview(description: string): VendorMatch | null {
    const normalized = normalizeMerchant(description);
    return matchVendor(normalized);
  }

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* ── Privacy Note (always visible) ── */}
      <div className="flex items-center gap-2 rounded-lg bg-[#D1FAE5] border border-[#A7F3D0] px-3 py-2">
        <Shield size={14} className="text-[#059669] shrink-0" />
        <p className="text-[11px] text-[#059669]">
          Your statement is processed locally. Raw transactions never leave your device.
        </p>
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-10 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[#6D28D9] bg-[#EDE9FE]'
              : 'border-[#E5E4DF] bg-[#FAFAF8] hover:border-[#D4D3CE] hover:bg-white'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                isDragging ? 'bg-[#6D28D9]' : 'bg-[#F4F4F1]'
              }`}
            >
              <Upload
                size={20}
                className={isDragging ? 'text-white' : 'text-[#A19F99]'}
              />
            </div>
            <div>
              <p className="text-[13px] text-[#111110] font-medium">
                {isDragging ? 'Drop your CSV here' : 'Drop a bank/card statement CSV'}
              </p>
              <p className="text-[11px] text-[#A19F99] mt-1">
                or click to browse. We support most bank export formats.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEE2E2] px-3 py-2">
          <AlertCircle size={14} className="text-[#DC2626] shrink-0" />
          <p className="text-[11px] text-[#DC2626]">{error}</p>
        </div>
      )}

      {/* ── Step 2: Column Mapping ── */}
      {step === 'mapping' && (
        <div className="cl-card p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={14} className="text-[#6D28D9]" />
              <p className="text-[13px] font-medium text-[#111110]">Map your columns</p>
            </div>
            <p className="text-[11px] text-[#A19F99]">
              We couldn&apos;t auto-detect the column layout. Please select which columns contain the date, description, and amount.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Date column */}
            <div>
              <label className="cl-label mb-1.5 block">Date Column</label>
              <div className="relative">
                <select
                  value={mapping?.date || ''}
                  onChange={(e) =>
                    setMapping((prev) => prev ? { ...prev, date: e.target.value } : null)
                  }
                  className="cl-input text-[12px] appearance-none pr-7"
                >
                  {headers.map((h) => (
                    <option key={`date-${h}`} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A19F99] pointer-events-none"
                />
              </div>
            </div>

            {/* Description column */}
            <div>
              <label className="cl-label mb-1.5 block">Description / Merchant</label>
              <div className="relative">
                <select
                  value={mapping?.description || ''}
                  onChange={(e) =>
                    setMapping((prev) => prev ? { ...prev, description: e.target.value } : null)
                  }
                  className="cl-input text-[12px] appearance-none pr-7"
                >
                  {headers.map((h) => (
                    <option key={`desc-${h}`} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A19F99] pointer-events-none"
                />
              </div>
            </div>

            {/* Amount column */}
            <div>
              <label className="cl-label mb-1.5 block">Amount</label>
              <div className="relative">
                <select
                  value={mapping?.amount || ''}
                  onChange={(e) =>
                    setMapping((prev) => prev ? { ...prev, amount: e.target.value } : null)
                  }
                  className="cl-input text-[12px] appearance-none pr-7"
                >
                  {headers.map((h) => (
                    <option key={`amt-${h}`} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A19F99] pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Preview of first 3 rows with current mapping */}
          {rawRows.length > 0 && mapping && (
            <div className="border border-[#E5E4DF] rounded-lg overflow-hidden">
              <div className="bg-[#FAFAF8] px-3 py-1.5 border-b border-[#E5E4DF]">
                <p className="cl-label">Preview (first 3 rows)</p>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#F0EFEA]">
                    <th className="px-3 py-1.5 text-left text-[#A19F99] font-medium">Date</th>
                    <th className="px-3 py-1.5 text-left text-[#A19F99] font-medium">Description</th>
                    <th className="px-3 py-1.5 text-right text-[#A19F99] font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-b border-[#F0EFEA] last:border-0">
                      <td className="px-3 py-1.5 text-[#605F5B]">
                        {row[mapping.date] || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-[#111110]">
                        {row[mapping.description] || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right text-[#111110] font-mono">
                        {row[mapping.amount] || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            type="button"
            onClick={handleMappingConfirm}
            className="cl-btn-primary w-full text-[12px]"
          >
            Apply Mapping
          </button>
        </div>
      )}

      {/* ── Step 3: Preview ── */}
      {step === 'preview' && aggregation && (
        <div className="space-y-3">
          {/* File info bar */}
          <div className="flex items-center justify-between cl-card px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[#6D28D9]" />
              <span className="text-[12px] font-medium text-[#111110]">{fileName}</span>
            </div>
            <span className="text-[11px] text-[#A19F99]">
              {aggregation.totalMatched} of {aggregation.totalRows} transactions identified
            </span>
          </div>

          {/* Detected vendors summary */}
          <div className="cl-card p-4">
            <p className="cl-label mb-2">Detected Vendors ({aggregation.vendors.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {aggregation.vendors.map((v) => (
                <span
                  key={v.vendorId}
                  className="inline-flex items-center gap-1 rounded-full bg-[#EDE9FE] px-2.5 py-1 text-[10px] font-medium text-[#5B21B6]"
                >
                  <Check size={10} />
                  {v.displayName}
                </span>
              ))}
            </div>
          </div>

          {/* Preview table — first 10 rows */}
          <div className="cl-card overflow-hidden">
            <div className="bg-[#FAFAF8] px-4 py-2 border-b border-[#E5E4DF] flex items-center justify-between">
              <p className="cl-label">Transaction Preview</p>
              <p className="text-[10px] text-[#A19F99]">Showing first 10 rows</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#E5E4DF]">
                    <th className="px-3 py-2 text-left text-[#A19F99] font-medium w-6">#</th>
                    <th className="px-3 py-2 text-left text-[#A19F99] font-medium">Date</th>
                    <th className="px-3 py-2 text-left text-[#A19F99] font-medium">Description</th>
                    <th className="px-3 py-2 text-right text-[#A19F99] font-medium">Amount</th>
                    <th className="px-3 py-2 text-left text-[#A19F99] font-medium">Vendor Match</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedTransactions.slice(0, 10).map((tx, i) => {
                    const vendorMatch = getVendorPreview(tx.description);
                    const month = parseDateToMonth(tx.date);
                    return (
                      <tr
                        key={i}
                        className="border-b border-[#F0EFEA] last:border-0 hover:bg-[#FAFAF8] transition-colors"
                      >
                        <td className="px-3 py-2 text-[#C8C6C0] font-mono">{i + 1}</td>
                        <td className="px-3 py-2 text-[#605F5B] font-mono whitespace-nowrap">
                          {month || tx.date}
                        </td>
                        <td className="px-3 py-2 text-[#111110] max-w-[200px] truncate">
                          {tx.description}
                        </td>
                        <td className="px-3 py-2 text-right text-[#111110] font-mono whitespace-nowrap">
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          {vendorMatch ? (
                            <span className="inline-flex items-center gap-1 text-[#059669]">
                              <Check size={10} />
                              {vendorMatch.displayName}
                            </span>
                          ) : (
                            <span className="text-[#C8C6C0]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unmatched count */}
          {aggregation.unmatchedRows.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] px-3 py-2">
              <AlertCircle size={14} className="text-[#D97706] shrink-0" />
              <p className="text-[11px] text-[#92400E]">
                {aggregation.unmatchedRows.length} {aggregation.unmatchedRows.length !== 1 ? 'transactions' : 'transaction'} couldn&apos;t be matched to a known AI vendor and will be skipped.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep('upload');
                setFileName('');
                setHeaders([]);
                setRawRows([]);
                setMapping(null);
                setParsedTransactions([]);
                setAggregation(null);
                setError('');
              }}
              className="cl-btn-ghost flex-1 justify-center"
            >
              Upload Different File
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={aggregation.vendors.length === 0}
              className="cl-btn-primary flex-1 text-[12px]"
            >
              Analyze {aggregation.vendors.length} Vendor{aggregation.vendors.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === 'done' && (
        <div className="cl-card p-5 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#D1FAE5]">
            <Check size={18} className="text-[#059669]" />
          </div>
          <p className="text-[13px] font-medium text-[#111110]">Statement processed</p>
          <p className="text-[11px] text-[#A19F99] mt-1">
            {aggregation?.vendors.length} vendor{aggregation?.vendors.length !== 1 ? 's' : ''} detected from {fileName}
          </p>
        </div>
      )}
    </div>
  );
}
