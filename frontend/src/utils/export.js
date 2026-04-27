import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export async function exportOrdersExcel(orders) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CRM Dashboard';
  const ws = wb.addWorksheet('Orders');

  ws.columns = [
    { header: 'Order ID', key: 'orderId', width: 20 },
    { header: 'Date', key: 'orderDate', width: 14 },
    { header: 'Customer', key: 'customerName', width: 20 },
    { header: 'Mobile', key: 'mobile', width: 14 },
    { header: 'City', key: 'city', width: 14 },
    { header: 'Product', key: 'productName', width: 22 },
    { header: 'Qty', key: 'quantity', width: 6 },
    { header: 'Value (₹)', key: 'orderValue', width: 12 },
    { header: 'Channel', key: 'salesChannel', width: 12 },
    { header: 'Source', key: 'leadSource', width: 12 },
    { header: 'Payment', key: 'paymentStatus', width: 12 },
    { header: 'Status', key: 'orderStatus', width: 12 },
    { header: 'Customer Type', key: 'customerType', width: 14 }
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  orders.forEach(o => {
    ws.addRow({
      ...o,
      orderDate: o.orderDate ? format(new Date(o.orderDate), 'dd/MM/yyyy') : ''
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `orders_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export function exportSummaryPDF(stats, channelData, topProducts) {
  const doc = new jsPDF();
  const now = format(new Date(), 'dd MMM yyyy');

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CRM Business Report', 14, 22);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${now}`, 14, 32);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Overview', 14, 54);

  const ov = stats?.overview || {};
  autoTable(doc, {
    startY: 60,
    head: [['Metric', 'Value']],
    body: [
      ['Total Orders', ov.totalOrders || 0],
      ['Total Revenue', `Rs. ${(ov.totalRevenue || 0).toLocaleString()}`],
      ['Average Order Value', `Rs. ${Math.round(ov.avgOrderValue || 0).toLocaleString()}`],
      ['Unique Customers', ov.uniqueCustomers || 0],
      ['Repeat Customers', ov.repeatCustomerCount || 0],
      ['Conversion Rate', `${ov.conversionRate || 0}%`],
      ['Total Leads', ov.totalLeads || 0],
      ['Converted Leads', ov.convertedLeads || 0]
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [245, 247, 255] }
  });

  if (channelData?.length) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Channel Performance', 14, doc.lastAutoTable.finalY + 16);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 22,
      head: [['Channel', 'Orders', 'Revenue']],
      body: channelData.map(c => [c._id, c.orders, `Rs. ${c.revenue?.toLocaleString()}`]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [79, 70, 229] }
    });
  }

  if (topProducts?.length) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Products', 14, doc.lastAutoTable.finalY + 16);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 22,
      head: [['Product', 'Orders', 'Revenue']],
      body: topProducts.map(p => [p._id, p.orders, `Rs. ${p.revenue?.toLocaleString()}`]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [79, 70, 229] }
    });
  }

  doc.save(`crm_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
