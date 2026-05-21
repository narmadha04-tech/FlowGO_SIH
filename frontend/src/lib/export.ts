/**
 * Export utilities for generating CSV and PDF reports
 */

export interface ExportData {
  hourlyData?: any[];
  signalPerformance?: any[];
  kpiData?: any[];
  timeRange?: string;
  [key: string]: any;
}

export function exportToCSV(data: ExportData, filename: string = "export"): void {
  try {
    let csvContent = "";

    // Export hourly data
    if (data.hourlyData && data.hourlyData.length > 0) {
      csvContent += "Hourly Traffic Data\n";
      csvContent += "Hour,Vehicles,Baseline,Optimized\n";
      data.hourlyData.forEach((row) => {
        csvContent += `${row.hour},${row.vehicles},${row.baseline},${row.optimized}\n`;
      });
      csvContent += "\n";
    }

    // Export signal performance
    if (data.signalPerformance && data.signalPerformance.length > 0) {
      csvContent += "Signal Performance\n";
      csvContent += "Signal ID,Efficiency,Queue Length,Timing\n";
      data.signalPerformance.forEach((row) => {
        csvContent += `${row.name},${row.efficiency},${row.queue},${row.timing}\n`;
      });
      csvContent += "\n";
    }

    // Export KPIs
    if (data.kpiData && data.kpiData.length > 0) {
      csvContent += "Key Performance Indicators\n";
      csvContent += "Metric,Value,Unit,Trend\n";
      data.kpiData.forEach((row) => {
        csvContent += `${row.name},${row.value},${row.unit},${row.trend}\n`;
      });
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    alert("Failed to export CSV. Please try again.");
  }
}

export function exportToPDF(data: { title: string; data: ExportData; timeRange?: string }): void {
  try {
    // For PDF export, we'll use a simple approach with window.print()
    // In production, you might want to use a library like jsPDF or pdfmake
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export PDF");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>${data.title}</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>Time Range: ${data.timeRange || "N/A"}</p>
          <h2>Key Performance Indicators</h2>
          <table>
            <tr><th>Metric</th><th>Value</th><th>Unit</th><th>Trend</th></tr>
            ${data.data.kpiData?.map((kpi: any) => 
              `<tr><td>${kpi.name}</td><td>${kpi.value}</td><td>${kpi.unit}</td><td>${kpi.trend}</td></tr>`
            ).join("") || ""}
          </table>
          <h2>Signal Performance</h2>
          <table>
            <tr><th>Signal ID</th><th>Efficiency</th><th>Queue Length</th><th>Timing</th></tr>
            ${data.data.signalPerformance?.map((sig: any) => 
              `<tr><td>${sig.name}</td><td>${sig.efficiency}%</td><td>${sig.queue}</td><td>${sig.timing}s</td></tr>`
            ).join("") || ""}
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  } catch (error) {
    console.error("Error exporting PDF:", error);
    alert("Failed to export PDF. Please try again.");
  }
}

