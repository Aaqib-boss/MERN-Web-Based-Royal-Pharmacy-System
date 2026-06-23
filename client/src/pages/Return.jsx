import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import DatePicker from '../components/DatePicker';
import AutoComplete from '../components/AutoComplete';
import QtyControl from '../components/QtyControl';
import { Plus, Trash2, Edit2, X, Loader2, RefreshCw, Calendar, FileText, MapPin, ClipboardList, Info, HelpCircle, Search, Download, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const getBase64ImageFromUrl = async (imageUrl) => {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", function () {
        resolve(reader.result);
      }, false);
      reader.onerror = () => {
        reject(new Error("Failed to convert image"));
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Error loading image for PDF:", err);
    return null;
  }
};

const Return = () => {
  const { user } = useAuth();
  // Return list state
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [pharmaciesList, setPharmaciesList] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form states
  const [date, setDate] = useState(new Date());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyId, setPharmacyId] = useState('');
  const [city, setCity] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]); // Array of { _id, productName, price, qty }
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Delete confirm state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchReturns();
    fetchPharmaciesList();
  }, []);

  const fetchPharmaciesList = async () => {
    try {
      const { data } = await api.get('/pharmacies');
      setPharmaciesList(data);
    } catch (error) {
      console.error('Error fetching pharmacies list for filters', error);
    }
  };

  // Client-side filtering logic
  const filteredReturns = returns.filter((record) => {
    // 1. Company Filter
    if (companyFilter !== 'all' && record.pharmacyId?._id !== companyFilter) {
      return false;
    }

    // 2. Date Filter
    if (dateFilter !== 'all') {
      if (dateFilter === 'custom') {
        if (startDate) {
          const startLimit = new Date(startDate);
          startLimit.setHours(0, 0, 0, 0);
          if (new Date(record.date) < startLimit) {
            return false;
          }
        }
        if (endDate) {
          const endLimit = new Date(endDate);
          endLimit.setHours(23, 59, 59, 999);
          if (new Date(record.date) > endLimit) {
            return false;
          }
        }
      } else {
        const recordTime = new Date(record.date).getTime();
        const now = Date.now();
        let limitMs = 0;
        if (dateFilter === 'week') {
          limitMs = 7 * 24 * 60 * 60 * 1000;
        } else if (dateFilter === 'month') {
          limitMs = 30 * 24 * 60 * 60 * 1000;
        } else if (dateFilter === 'year') {
          limitMs = 365 * 24 * 60 * 60 * 1000;
        }
        if (now - recordTime > limitMs) {
          return false;
        }
      }
    }

    // 3. Search Query Filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const invoiceNo = (record.invoiceNumber || '').toLowerCase();
      const pName = (record.pharmacyId?.companyName || '').toLowerCase();
      const pCity = (record.city || '').toLowerCase();
      const pReason = (record.reason || '').toLowerCase();
      const refName = (record.pharmacyId?.refName || '').toLowerCase();
      
      const matchesProducts = record.products.some((prod) =>
        (prod.productName || '').toLowerCase().includes(query)
      );

      const matchesBasic =
        invoiceNo.includes(query) ||
        pName.includes(query) ||
        pCity.includes(query) ||
        pReason.includes(query) ||
        refName.includes(query);

      if (!matchesBasic && !matchesProducts) {
        return false;
      }
    }

    return true;
  });

  const generatePDFReport = async (action = 'download') => {
    const doc = new jsPDF();

    // Load logo
    const logoBase64 = await getBase64ImageFromUrl('/royal_logo.png');

    // 1. Logo image on top-left
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 12, 60, 16);
    }

    // 2. Company Details on top-right (right aligned)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('Royal Pharmacy Lanka (Pvt) limited', 196, 17, { align: 'right' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('NO 47/3 A, PRISON CAMP ROAD, NEGOMBO.', 196, 22, { align: 'right' });
    doc.text('TP: +94312232313, +94704848383', 196, 26, { align: 'right' });
    doc.text('e-Mail: royalpharmangm@gmail.com', 196, 30, { align: 'right' });

    // 3. Double separator line
    doc.setDrawColor(16, 185, 129); // Emerald-500
    doc.setLineWidth(0.8);
    doc.line(14, 35, 196, 35);
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.3);
    doc.line(14, 37, 196, 37);

    // 4. Report metadata
    let currentY = 46;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text('Product Returns Ledger Report', 14, currentY);
    
    currentY += 6;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(`Delivery Assistance: ${user?.name || 'Staff'}`, 14, currentY);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`, 196, currentY, { align: 'right' });
    
    currentY += 6;

    // Prepare table data (excluding notes column)
    const tableHeaders = [['Date', 'Invoice No', 'Pharmacy & City', 'Ref Name', 'Products', 'Qty', 'Bonus', 'Reason']];
    const tableRows = filteredReturns.map((record) => {
      const formattedDate = new Date(record.date).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      
      const pharmacyDetails = `${record.pharmacyId?.companyName || 'Unknown'}\n(${record.city || ''})`;
      const refName = record.pharmacyId?.refName || '-';
      const productNames = record.products.map((p) => p.productName).join('\n');
      const quantities = record.qty.map((q) => String(q).padStart(2, '0')).join('\n');
      const bonuses = record.products.map((_, idx) => String(record.bonus ? record.bonus[idx] || 0 : 0).padStart(2, '0')).join('\n');

      return [
        formattedDate,
        record.invoiceNumber,
        pharmacyDetails,
        refName,
        productNames,
        quantities,
        bonuses,
        record.reason,
      ];
    });

    // Generate table
    autoTable(doc, {
      startY: currentY,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 18 }, // Date
        1: { cellWidth: 18 }, // Invoice No
        2: { cellWidth: 36 }, // Pharmacy & City
        3: { cellWidth: 22 }, // Ref Name
        4: { cellWidth: 40 }, // Products
        5: { cellWidth: 10, halign: 'center' }, // Qty
        6: { cellWidth: 12, halign: 'center' }, // Bonus
        7: { cellWidth: 34 }, // Reason
      },
    });

    if (action === 'print') {
      const blob = doc.output('blob');
      const blobURL = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobURL;
      document.body.appendChild(iframe);
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      const filename =
        companyFilter !== 'all'
          ? `returns_report_${pharmaciesList.find((p) => p._id === companyFilter)?.companyName.replace(/\s+/g, '_')}.pdf`
          : 'returns_report_all.pdf';
      doc.save(filename);
    }
  };

  const handleDownloadPDF = async () => {
    await generatePDFReport('download');
  };

  const handlePrintPDF = async () => {
    await generatePDFReport('print');
  };

  const handleDownloadExcel = () => {
    const dataRows = [];

    let dateRangeStr = 'All Time';
    if (dateFilter === 'week') dateRangeStr = 'Last 7 Days';
    else if (dateFilter === 'month') dateRangeStr = 'Last 30 Days';
    else if (dateFilter === 'year') dateRangeStr = 'Last 365 Days';
    else if (dateFilter === 'custom') {
      const startStr = startDate ? new Date(startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Beginning';
      const endStr = endDate ? new Date(endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Present';
      dateRangeStr = `${startStr} to ${endStr}`;
    }

    // Header metadata
    if (companyFilter !== 'all' || dateFilter !== 'all') {
      const row1 = {};
      if (companyFilter !== 'all') {
        const selectedPharmObj = pharmaciesList.find((p) => p._id === companyFilter);
        row1['Date'] = 'Company Name:';
        row1['Invoice No'] = selectedPharmObj ? selectedPharmObj.companyName : 'Selected Company';
        row1['Pharmacy Name'] = 'City:';
        row1['City'] = selectedPharmObj ? selectedPharmObj.city : '';
      }
      row1['Products'] = 'Filter Period:';
      row1['Qty'] = dateRangeStr;
      dataRows.push(row1);
      dataRows.push({}); // Empty separator row
    }

    filteredReturns.forEach((record) => {
      const formattedDate = new Date(record.date).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const productNames = record.products.map((p) => p.productName).join(', ');
      const quantities = record.qty.map((q) => `${q}`).join(', ');
      const bonuses = record.products.map((_, idx) => record.bonus ? record.bonus[idx] || 0 : 0).join(', ');

      dataRows.push({
        'Date': formattedDate,
        'Invoice No': record.invoiceNumber,
        'Pharmacy Name': record.pharmacyId?.companyName || 'Unknown Pharmacy',
        'Ref Name': record.pharmacyId?.refName || '',
        'City': record.city,
        'Products': productNames,
        'Qty': quantities,
        'Bonus': bonuses,
        'Reason': record.reason,
        'Notes': record.notes || '',
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows, {
      header: ['Date', 'Invoice No', 'Pharmacy Name', 'Ref Name', 'City', 'Products', 'Qty', 'Bonus', 'Reason', 'Notes']
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Returns Ledger');

    const filename =
      companyFilter !== 'all'
        ? `returns_report_${pharmaciesList.find((p) => p._id === companyFilter)?.companyName.replace(/\s+/g, '_')}.xlsx`
        : 'returns_report_all.xlsx';

    XLSX.writeFile(workbook, filename);
  };

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/returns');
      setReturns(data);
    } catch (error) {
      toast.error('Error fetching return ledger');
    } finally {
      setLoading(false);
    }
  };

  const handlePharmacySelect = (pharmacy) => {
    setPharmacyId(pharmacy._id);
    setPharmacyName(pharmacy.companyName);
    setCity(pharmacy.city);
  };

  const handlePharmacyTextChange = (text) => {
    // If user changes text manually, clear the bound ID and city
    setPharmacyName(text);
    setPharmacyId('');
    setCity('');
  };

  const handleReasonSelect = (reasonObj) => {
    setReason(reasonObj.reasonName);
  };

  const handleReasonTextChange = (text) => {
    setReason(text);
  };

  const handleProductSelect = (product) => {
    // Check if product is already in list
    if (selectedProducts.some((p) => p._id === product._id)) {
      toast.warning('Product already added, adjust quantity instead.');
      return;
    }

    setSelectedProducts([...selectedProducts, { ...product, qty: 1, bonus: 0 }]);
  };

  const handleProductQtyChange = (productId, newQty) => {
    setSelectedProducts(
      selectedProducts.map((p) => (p._id === productId ? { ...p, qty: newQty } : p))
    );
  };

  const handleProductBonusChange = (productId, newBonus) => {
    setSelectedProducts(
      selectedProducts.map((p) => (p._id === productId ? { ...p, bonus: newBonus } : p))
    );
  };

  const handleProductRemove = (productId) => {
    setSelectedProducts(selectedProducts.filter((p) => p._id !== productId));
  };

  const resetForm = () => {
    setDate(new Date());
    setInvoiceNumber('');
    setPharmacyName('');
    setPharmacyId('');
    setCity('');
    setSelectedProducts([]);
    setReason('');
    setNotes('');
    setIsEditing(false);
    setEditId(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!invoiceNumber) {
      toast.warning('Invoice Number is required');
      return;
    }
    const isExistingPharma = /^[0-9a-fA-F]{24}$/.test(pharmacyId);
    if (!isExistingPharma && !pharmacyName.trim()) {
      toast.warning('Pharmacy Name is required');
      return;
    }
    if (!isExistingPharma && !city.trim()) {
      toast.warning('City is required for new pharmacy');
      return;
    }
    if (selectedProducts.length === 0) {
      toast.warning('Please add at least one product');
      return;
    }
    if (!reason) {
      toast.warning('Reason is required');
      return;
    }

    const payload = {
      date,
      invoiceNumber,
      pharmacyId: pharmacyId || pharmacyName,
      city,
      products: selectedProducts.map((p) => p._id),
      qty: selectedProducts.map((p) => p.qty),
      bonus: selectedProducts.map((p) => p.bonus || 0),
      reason,
      notes,
    };

    setLoading(true);
    try {
      if (isEditing) {
        const { data } = await api.put(`/returns/${editId}`, payload);
        setReturns(returns.map((r) => (r._id === editId ? data : r)));
        toast.success('Return invoice updated successfully!');
      } else {
        const { data } = await api.post('/returns', payload);
        setReturns([data, ...returns]);
        toast.success('Return invoice logged successfully!');
      }
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving return record');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (record) => {
    setIsEditing(true);
    setEditId(record._id);
    setDate(new Date(record.date));
    setInvoiceNumber(record.invoiceNumber);
    setPharmacyId(record.pharmacyId?._id || '');
    setPharmacyName(record.pharmacyId?.companyName || '');
    setCity(record.city);
    setReason(record.reason);
    setNotes(record.notes || '');

    // Map database products/qty array back to state object structure
    const mappedProducts = record.products.map((prod, idx) => ({
      _id: prod._id,
      productName: prod.productName,
      price: prod.price,
      qty: record.qty[idx] || 1,
      bonus: record.bonus ? record.bonus[idx] || 0 : 0,
    }));
    setSelectedProducts(mappedProducts);

    // Scroll form into view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerDeleteConfirm = (record) => {
    setDeleteTarget(record);
    setShowConfirmDelete(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      await api.delete(`/returns/${deleteTarget._id}`);
      setReturns(returns.filter((r) => r._id !== deleteTarget._id));
      toast.success('Return ledger entry removed');
      setShowConfirmDelete(false);
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to remove record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat text-slate-800 dark:text-slate-100 transition-colors duration-300 pb-16 relative"
      style={{ backgroundImage: "url('/dashboard_bg.png')" }}
    >
      <div className="absolute inset-0 bg-lightBg/96 dark:bg-darkBg/96 backdrop-blur-[1px] z-0"></div>
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary-emerald bg-clip-text text-transparent">
            Product Returns Management
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Log pharmacy product returns and manage credit claims
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left / Top: Form Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 glass-panel rounded-3xl p-6 card-hover">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                <ClipboardList className="w-5 h-5 mr-2 text-primary" />
                <span>{isEditing ? 'Edit Return Log' : 'New Return Log'}</span>
              </h2>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    Return Date
                  </label>
                  <DatePicker selected={date} onChange={(d) => setDate(d)} />
                </div>

                {/* Invoice Number */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-1004"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm"
                  />
                </div>

                {/* Pharmacy Name Autocomplete */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    Pharmacy Name
                  </label>
                  <AutoComplete
                    apiPath="/pharmacies"
                    placeholder="Search pharmacy..."
                    displayField="companyName"
                    onSelect={handlePharmacySelect}
                    value={pharmacyName}
                    onChangeText={handlePharmacyTextChange}
                  />
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    {/^[0-9a-fA-F]{24}$/.test(pharmacyId) ? "City (Auto-filled)" : "City"}
                  </label>
                  <input
                    type="text"
                    readOnly={/^[0-9a-fA-F]{24}$/.test(pharmacyId)}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={/^[0-9a-fA-F]{24}$/.test(pharmacyId) ? "Select pharmacy first" : "Enter city"}
                    className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm ${
                      /^[0-9a-fA-F]{24}$/.test(pharmacyId)
                        ? 'bg-slate-100 dark:bg-darkBg-input text-slate-500 dark:text-slate-400 cursor-not-allowed font-semibold focus:outline-none'
                        : 'bg-white dark:bg-darkBg-card'
                    }`}
                  />
                </div>

                {/* Products Autocomplete Multi */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    Select Products
                  </label>
                  <AutoComplete
                    apiPath="/products"
                    placeholder="Type to find products..."
                    displayField="productName"
                    onSelect={handleProductSelect}
                    value=""
                    excludeIds={selectedProducts.map((p) => p._id)}
                    clearOnSelect={true}
                  />

                  {/* Selected Products List */}
                  {selectedProducts.length > 0 && (
                    <div className="mt-3 border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50/50 dark:bg-darkBg-input/30 p-3 space-y-3.5 max-h-56 overflow-y-auto shadow-inner">
                      {selectedProducts.map((prod) => (
                        <div key={prod._id} className="flex flex-col text-xs border-b border-slate-200/50 dark:border-white/5 pb-3 last:border-b-0 last:pb-0 gap-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{prod.productName}</div>
                              <div className="text-slate-400 font-bold mt-0.5">RS {prod.price.toFixed(2)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleProductRemove(prod._id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-darkBg-input transition-all"
                              title="Remove Product"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/50 dark:bg-black/20 p-2 rounded-xl border border-slate-200/30 dark:border-white/5">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Qty:</span>
                              <QtyControl
                                value={prod.qty}
                                onChange={(val) => handleProductQtyChange(prod._id, val)}
                              />
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bonus:</span>
                              <QtyControl
                                value={prod.bonus || 0}
                                onChange={(val) => handleProductBonusChange(prod._id, val)}
                                min={0}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reason */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    Reason
                  </label>
                  <AutoComplete
                    apiPath="/reasons"
                    placeholder="Search or type a reason..."
                    displayField="reasonName"
                    onSelect={handleReasonSelect}
                    value={reason}
                    onChangeText={handleReasonTextChange}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows="2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional context..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-sm resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-2 pt-2">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-darkBg-input transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] flex items-center justify-center py-2.5 bg-gradient-to-r from-primary to-primary-emerald text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] hover:shadow-primary/25 transition-all duration-150 disabled:opacity-50 text-sm"
                  >
                    {loading ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      <span>{isEditing ? 'Update Return' : 'Submit Return'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right / Bottom: Ledger Column */}
          <div className="lg:col-span-3">
            <div className="glass-panel rounded-3xl overflow-hidden w-full">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Return Ledger Entries</h3>
                <button
                  onClick={fetchReturns}
                  className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-darkBg-input transition-all"
                  title="Reload Ledger"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Filters & Actions Panel */}
              <div className="p-4 bg-slate-50/30 dark:bg-white/[0.01] border-b border-slate-100 dark:border-white/5 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center w-full">
                  {/* Search Box */}
                  <div className="relative md:col-span-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search invoice, pharmacy, city, ref name, products..."
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 placeholder-slate-400 focus-glow transition-all duration-200 text-xs"
                    />
                  </div>

                  {/* Company Select Dropdown */}
                  <div className="md:col-span-3">
                    <select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 focus-glow transition-all duration-200 text-xs cursor-pointer"
                    >
                      <option value="all">All Companies</option>
                      {pharmaciesList.map((pharm) => (
                        <option key={pharm._id} value={pharm._id}>
                          {pharm.companyName} ({pharm.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter Dropdown */}
                  <div className="md:col-span-2">
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 focus-glow transition-all duration-200 text-xs cursor-pointer"
                    >
                      <option value="all">All Time</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {/* Export Buttons */}
                  <div className="md:col-span-3 flex gap-2 justify-end">
                    <button
                      onClick={handleDownloadPDF}
                      disabled={filteredReturns.length === 0}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-650 text-white rounded-xl font-semibold shadow hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all text-xs disabled:opacity-50 disabled:scale-100"
                      title="Download PDF Report"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={handlePrintPDF}
                      disabled={filteredReturns.length === 0}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-650 text-white rounded-xl font-semibold shadow hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all text-xs disabled:opacity-50 disabled:scale-100"
                      title="Print Report"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={handleDownloadExcel}
                      disabled={filteredReturns.length === 0}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-primary to-primary-emerald hover:from-emerald-500 hover:to-primary text-white rounded-xl font-semibold shadow hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all text-xs disabled:opacity-50 disabled:scale-100"
                      title="Export to Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>

                {/* Custom Date Range Picker inputs */}
                {dateFilter === 'custom' && (
                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-200/50 dark:border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Start Date:</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 focus-glow transition-all duration-200 text-xs"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">End Date:</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-darkBg-card text-slate-800 dark:text-slate-100 focus-glow transition-all duration-200 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {loading && returns.length === 0 ? (
                <div className="flex justify-center items-center py-24">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
              ) : returns.length === 0 ? (
                <div className="py-24 text-center text-slate-400 dark:text-slate-500 italic">
                  No return records found in database.
                </div>
              ) : filteredReturns.length === 0 ? (
                <div className="py-24 text-center text-slate-400 dark:text-slate-500 italic">
                  No matching records found for the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-xs sm:text-sm return-table">
                    <thead>
                      <tr className="bg-primary/10 dark:bg-primary-emerald/10 text-primary dark:text-primary-emerald text-[10px] sm:text-xs font-extrabold uppercase tracking-wider border-b border-primary/20 dark:border-primary-emerald/20">
                        <th>Date</th>
                        <th>Invoice No</th>
                        <th>Pharmacy & City</th>
                        <th>Ref Name</th>
                        <th>Products</th>
                        <th>Qty</th>
                        <th>Bonus</th>
                        <th>Reason & Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {[...filteredReturns]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((record) => (
                        <tr key={record._id} className="hover:bg-slate-500/5 dark:hover:bg-white/5 transition-colors duration-150">
                          <td className="text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                            {new Date(record.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td>
                            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200/40 dark:border-white/5">
                              {record.invoiceNumber}
                            </span>
                          </td>
                          <td className="multiline-cell">
                            <div className="font-bold text-slate-800 dark:text-white truncate">
                              {record.pharmacyId?.companyName || 'Unknown Pharmacy'}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5 flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/45 dark:bg-primary-emerald/45 mr-1.5 inline-block"></span>
                              {record.city}
                            </div>
                          </td>
                          <td className="font-semibold text-slate-700 dark:text-slate-300">
                            {record.pharmacyId?.refName || '-'}
                          </td>
                          <td className="multiline-cell">
                            <div className="space-y-1.5">
                              {record.products.map((prod) => (
                                <div key={prod._id} className="h-8 flex items-center justify-center text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                                  {prod.productName}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="multiline-cell">
                            <div className="space-y-1.5">
                              {record.products.map((prod, idx) => (
                                <div key={`${prod._id}-qty`} className="h-8 flex items-center justify-center font-bold text-accent text-[11px]">
                                  {String(record.qty[idx] || 0).padStart(2, '0')}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="multiline-cell">
                            <div className="space-y-1.5">
                              {record.products.map((prod, idx) => (
                                <div key={`${prod._id}-bonus`} className="h-8 flex items-center justify-center font-bold text-amber-500 dark:text-amber-400 text-[11px]">
                                  {String(record.bonus ? record.bonus[idx] || 0 : 0).padStart(2, '0')}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="multiline-cell">
                            <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {record.reason}
                            </div>
                            {record.notes && (
                              <div className="text-slate-500 dark:text-slate-400 text-xs mt-1 truncate flex items-center justify-center font-medium" title={record.notes}>
                                <span className="italic">Note: "{record.notes}"</span>
                              </div>
                            )}
                          </td>
                          <td className="space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleEditClick(record)}
                              className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/10 dark:hover:border-primary-emerald/15 transition-all duration-200"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => triggerDeleteConfirm(record)}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 dark:hover:bg-red-500/20 transition-all duration-200"
                              title="Delete"
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
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200">
            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              Are you sure?
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You are about to delete Return entry for invoice{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {deleteTarget?.invoiceNumber}
              </span>
              . This action cannot be undone.
            </p>

            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-950/20 text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-darkBg-input transition-colors duration-150 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all duration-150 disabled:opacity-50 text-sm"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Return;
