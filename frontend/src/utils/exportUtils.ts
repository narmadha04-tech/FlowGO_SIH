/**
 * Export utilities for generating PDF and CSV reports
 */

export interface ExportData {
  accidents: any[];
  hazards: any[];
  violations: any[];
  analytics: any;
  predictions: any;
  sustainability: any;
  timestamp: number;
}

export async function exportToCSV(data: ExportData): Promise<void> {
  const rows: string[] = [];
  
  // Header
  rows.push("FlowGo Traffic Intelligence Report");
  rows.push(`Generated: ${new Date(data.timestamp * 1000).toLocaleString()}`);
  rows.push("");
  
  // Accidents
  rows.push("ACCIDENTS");
  rows.push("ID,Severity,Type,Description,Location,Vehicles Involved,Injuries,Reported At,Status");
  data.accidents.forEach((accident) => {
    rows.push([
      accident.id,
      accident.severity,
      accident.type,
      `"${accident.description}"`,
      `${accident.location[0]},${accident.location[1]}`,
      accident.vehicles_involved,
      accident.injuries,
      new Date(accident.reported_at * 1000).toLocaleString(),
      accident.status,
    ].join(","));
  });
  rows.push("");
  
  // Hazards
  rows.push("HAZARDS");
  rows.push("ID,Type,Severity,Description,Location,Start Time,End Time,Status");
  data.hazards.forEach((hazard) => {
    rows.push([
      hazard.id,
      hazard.type,
      hazard.severity,
      `"${hazard.description}"`,
      `${hazard.location[0]},${hazard.location[1]}`,
      new Date(hazard.start_time * 1000).toLocaleString(),
      new Date(hazard.end_time * 1000).toLocaleString(),
      hazard.status,
    ].join(","));
  });
  rows.push("");
  
  // Violations
  rows.push("VIOLATIONS");
  rows.push("ID,Type,Description,Location,Timestamp,Status");
  data.violations.forEach((violation) => {
    rows.push([
      violation.id,
      violation.type,
      `"${violation.description}"`,
      `${violation.location[0]},${violation.location[1]}`,
      new Date(violation.timestamp * 1000).toLocaleString(),
      violation.status,
    ].join(","));
  });
  rows.push("");
  
  // Analytics Summary
  if (data.analytics) {
    rows.push("LIVE ANALYTICS");
    rows.push("Metric,Value");
    rows.push(`Average Speed,${data.analytics.speed_flow?.average_speed || 0} km/h`);
    rows.push(`Traffic Density,${data.analytics.density?.vehicles_per_km || 0} vehicles/km`);
    rows.push(`Average Wait Time,${data.analytics.wait_time?.average || 0} seconds`);
    rows.push(`Signal Delay,${data.analytics.signal_delay?.average_delay || 0} seconds`);
    rows.push("");
  }
  
  // Sustainability
  if (data.sustainability) {
    rows.push("SUSTAINABILITY METRICS");
    rows.push("Metric,Value");
    rows.push(`Fuel Wastage (Today),${data.sustainability.fuel_wastage?.total_today || 0} L`);
    rows.push(`CO₂ Emissions (Today),${data.sustainability.co2_emissions?.total_today || 0} kg`);
    rows.push(`Tree Equivalent,${data.sustainability.co2_emissions?.equivalent_trees || 0} trees`);
    rows.push("");
  }
  
  // Predictions
  if (data.predictions) {
    rows.push("PREDICTIONS");
    rows.push("Metric,Value");
    rows.push(`Accident Likelihood,${data.predictions.accident_likelihood?.probability || 0}%`);
    rows.push(`Travel Time (Avg),${data.predictions.travel_time_estimation?.average || 0} minutes`);
  }
  
  // Create blob and download
  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `traffic-intelligence-report-${Date.now()}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export async function exportToPDF(data: ExportData): Promise<void> {
  // For PDF export, we'll use a simple HTML-to-PDF approach
  // In production, you might want to use a library like jsPDF or pdfkit
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>FlowGo Traffic Intelligence Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          h2 { color: #666; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .metric { margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>FlowGo Traffic Intelligence Report</h1>
        <p>Generated: ${new Date(data.timestamp * 1000).toLocaleString()}</p>
        
        <h2>Accidents (${data.accidents.length})</h2>
        <table>
          <tr>
            <th>ID</th><th>Severity</th><th>Type</th><th>Description</th><th>Location</th><th>Status</th>
          </tr>
          ${data.accidents.map(a => `
            <tr>
              <td>${a.id}</td>
              <td>${a.severity}</td>
              <td>${a.type}</td>
              <td>${a.description}</td>
              <td>${a.location[0]}, ${a.location[1]}</td>
              <td>${a.status}</td>
            </tr>
          `).join("")}
        </table>
        
        <h2>Hazards (${data.hazards.length})</h2>
        <table>
          <tr>
            <th>ID</th><th>Type</th><th>Severity</th><th>Description</th><th>Status</th>
          </tr>
          ${data.hazards.map(h => `
            <tr>
              <td>${h.id}</td>
              <td>${h.type}</td>
              <td>${h.severity}</td>
              <td>${h.description}</td>
              <td>${h.status}</td>
            </tr>
          `).join("")}
        </table>
        
        <h2>Violations (${data.violations.length})</h2>
        <table>
          <tr>
            <th>ID</th><th>Type</th><th>Description</th><th>Timestamp</th>
          </tr>
          ${data.violations.map(v => `
            <tr>
              <td>${v.id}</td>
              <td>${v.type}</td>
              <td>${v.description}</td>
              <td>${new Date(v.timestamp * 1000).toLocaleString()}</td>
            </tr>
          `).join("")}
        </table>
        
        ${data.analytics ? `
          <h2>Live Analytics</h2>
          <div class="metric">Average Speed: ${data.analytics.speed_flow?.average_speed || 0} km/h</div>
          <div class="metric">Traffic Density: ${data.analytics.density?.vehicles_per_km || 0} vehicles/km</div>
          <div class="metric">Average Wait Time: ${data.analytics.wait_time?.average || 0} seconds</div>
        ` : ""}
        
        ${data.sustainability ? `
          <h2>Sustainability Metrics</h2>
          <div class="metric">Fuel Wastage (Today): ${data.sustainability.fuel_wastage?.total_today || 0} L</div>
          <div class="metric">CO₂ Emissions (Today): ${data.sustainability.co2_emissions?.total_today || 0} kg</div>
          <div class="metric">Tree Equivalent: ${data.sustainability.co2_emissions?.equivalent_trees || 0} trees</div>
        ` : ""}
      </body>
    </html>
  `;
  
  // Open in new window for printing/saving as PDF
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
