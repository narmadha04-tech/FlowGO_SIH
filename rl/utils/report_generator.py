"""
Report Generation Service
Generates PDF and CSV reports for traffic data and sustainability metrics
"""

from __future__ import annotations
import json
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import io

try:
    from reportlab.lib.pagesizes import letter, A4  # type: ignore
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # type: ignore
    from reportlab.lib.units import inch  # type: ignore
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image  # type: ignore
    from reportlab.lib import colors  # type: ignore
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


class ReportGenerator:
    """Generate professional traffic reports in PDF and CSV formats."""
    
    def __init__(self, output_dir: Path = None):
        self.output_dir = output_dir or Path(__file__).parent.parent / "artifacts" / "reports"
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_daily_traffic_report(
        self,
        date_str: str,
        traffic_data: Dict[str, Any],
        incidents: List[Dict[str, Any]],
        format: str = "pdf"
    ) -> Path:
        """
        Generate daily traffic report.
        
        Args:
            date_str: Date string (YYYY-MM-DD)
            traffic_data: Daily traffic metrics
            incidents: List of incidents that day
            format: 'pdf' or 'csv'
        
        Returns:
            Path to generated report
        """
        if format == "pdf":
            return self._generate_pdf_daily_report(date_str, traffic_data, incidents)
        elif format == "csv":
            return self._generate_csv_daily_report(date_str, traffic_data, incidents)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_pdf_daily_report(
        self,
        date_str: str,
        traffic_data: Dict[str, Any],
        incidents: List[Dict[str, Any]]
    ) -> Path:
        """Generate PDF daily report using ReportLab."""
        if not REPORTLAB_AVAILABLE:
            return self._generate_csv_daily_report(date_str, traffic_data, incidents)
        
        filename = self.output_dir / f"daily_report_{date_str}.pdf"
        doc = SimpleDocTemplate(str(filename), pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#003366'),
            spaceAfter=30,
            alignment=1  # Center
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#004499'),
            spaceAfter=12,
            spaceBefore=12
        )
        
        # Title
        story.append(Paragraph(f"Daily Traffic Report - {date_str}", title_style))
        story.append(Spacer(1, 0.2 * inch))
        
        # Summary Section
        story.append(Paragraph("Executive Summary", heading_style))
        
        summary_data = [
            ["Metric", "Value"],
            ["Date", date_str],
            ["Total Vehicles", str(traffic_data.get("total_vehicles", 0))],
            ["Average Speed", f"{traffic_data.get('avg_speed', 0):.1f} km/h"],
            ["Peak Congestion Time", traffic_data.get("peak_time", "N/A")],
            ["Congestion Level", traffic_data.get("congestion_level", "Normal")],
            ["Total Incidents", str(len(incidents))],
        ]
        
        summary_table = Table(summary_data, colWidths=[2.5*inch, 2.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#004499')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 0.3 * inch))
        
        # Traffic Metrics Section
        story.append(Paragraph("Traffic Metrics", heading_style))
        
        metrics_data = [
            ["Hour", "Vehicles", "Avg Speed", "Congestion %"],
        ]
        
        for hour_data in traffic_data.get("hourly_metrics", [])[:12]:
            metrics_data.append([
                hour_data.get("hour", ""),
                str(hour_data.get("vehicle_count", 0)),
                f"{hour_data.get('avg_speed', 0):.1f}",
                f"{hour_data.get('congestion', 0):.1f}%",
            ])
        
        if len(metrics_data) > 1:
            metrics_table = Table(metrics_data, colWidths=[1.2*inch, 1.2*inch, 1.3*inch, 1.3*inch])
            metrics_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#004499')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(metrics_table)
        
        story.append(Spacer(1, 0.3 * inch))
        
        # Incidents Section
        story.append(Paragraph("Incidents Report", heading_style))
        
        if incidents:
            incidents_data = [
                ["Time", "Type", "Location", "Severity", "Status"],
            ]
            
            for incident in incidents[:10]:
                incidents_data.append([
                    incident.get("time", ""),
                    incident.get("type", ""),
                    incident.get("location", ""),
                    incident.get("severity", ""),
                    incident.get("status", ""),
                ])
            
            incidents_table = Table(incidents_data, colWidths=[1*inch, 1.2*inch, 1.5*inch, 1*inch, 1*inch])
            incidents_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#cc0000')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightcyan),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            story.append(incidents_table)
        else:
            story.append(Paragraph("No incidents reported.", styles['Normal']))
        
        story.append(Spacer(1, 0.3 * inch))
        
        # Recommendations Section
        story.append(Paragraph("Recommendations", heading_style))
        recommendations = traffic_data.get("recommendations", [
            "Monitor peak congestion hours (8-10 AM, 5-7 PM)",
            "Consider signal timing adjustments during peak hours",
            "Increase patrol presence in high-incident areas",
            "Promote eco-friendly transport during rush hours",
        ])
        
        for i, rec in enumerate(recommendations, 1):
            story.append(Paragraph(f"• {rec}", styles['Normal']))
        
        story.append(Spacer(1, 0.2 * inch))
        
        # Footer
        footer_text = f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        story.append(Paragraph(footer_text, ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.grey,
            alignment=2  # Right
        )))
        
        # Build PDF
        doc.build(story)
        return filename
    
    def _generate_csv_daily_report(
        self,
        date_str: str,
        traffic_data: Dict[str, Any],
        incidents: List[Dict[str, Any]]
    ) -> Path:
        """Generate CSV daily report."""
        filename = self.output_dir / f"daily_report_{date_str}.csv"
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Header
            writer.writerow(["Daily Traffic Report", date_str])
            writer.writerow([])
            
            # Summary
            writer.writerow(["Summary"])
            writer.writerow(["Total Vehicles", traffic_data.get("total_vehicles", 0)])
            writer.writerow(["Average Speed (km/h)", f"{traffic_data.get('avg_speed', 0):.1f}"])
            writer.writerow(["Peak Time", traffic_data.get("peak_time", "N/A")])
            writer.writerow(["Congestion Level", traffic_data.get("congestion_level", "Normal")])
            writer.writerow(["Total Incidents", len(incidents)])
            writer.writerow([])
            
            # Hourly metrics
            writer.writerow(["Hourly Metrics"])
            writer.writerow(["Hour", "Vehicle Count", "Avg Speed (km/h)", "Congestion %"])
            for hour_data in traffic_data.get("hourly_metrics", []):
                writer.writerow([
                    hour_data.get("hour", ""),
                    hour_data.get("vehicle_count", 0),
                    f"{hour_data.get('avg_speed', 0):.1f}",
                    f"{hour_data.get('congestion', 0):.1f}",
                ])
            
            writer.writerow([])
            
            # Incidents
            writer.writerow(["Incidents"])
            writer.writerow(["Time", "Type", "Location", "Severity", "Status", "Description"])
            for incident in incidents:
                writer.writerow([
                    incident.get("time", ""),
                    incident.get("type", ""),
                    incident.get("location", ""),
                    incident.get("severity", ""),
                    incident.get("status", ""),
                    incident.get("description", ""),
                ])
        
        return filename
    
    def generate_sustainability_report(
        self,
        period: str = "daily",
        sustainability_data: Dict[str, Any] = None,
        format: str = "pdf"
    ) -> Path:
        """
        Generate sustainability report.
        
        Args:
            period: 'daily', 'weekly', or 'monthly'
            sustainability_data: Sustainability metrics
            format: 'pdf' or 'csv'
        
        Returns:
            Path to generated report
        """
        if sustainability_data is None:
            sustainability_data = {
                "total_co2_kg": 1250.5,
                "total_fuel_liters": 450.2,
                "vehicles_counted": 2500,
                "trees_offset": 59.5,
                "avg_eco_score": 72.3,
            }
        
        filename = self.output_dir / f"sustainability_{period}_{datetime.now().strftime('%Y%m%d')}.{format}"
        
        if format == "pdf" and REPORTLAB_AVAILABLE:
            return self._generate_pdf_sustainability_report(period, sustainability_data, filename)
        else:
            return self._generate_csv_sustainability_report(period, sustainability_data, filename)
    
    def _generate_pdf_sustainability_report(
        self,
        period: str,
        data: Dict[str, Any],
        filename: Path
    ) -> Path:
        """Generate PDF sustainability report."""
        if not REPORTLAB_AVAILABLE:
            return filename
        
        doc = SimpleDocTemplate(str(filename), pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#10b981'),
            spaceAfter=30,
            alignment=1
        )
        
        # Title
        story.append(Paragraph(f"Sustainability Report - {period.title()}", title_style))
        story.append(Spacer(1, 0.2 * inch))
        
        # Key Metrics
        metrics_data = [
            ["Metric", "Value"],
            ["CO₂ Emitted", f"{data.get('total_co2_kg', 0)} kg"],
            ["Fuel Used", f"{data.get('total_fuel_liters', 0)} liters"],
            ["Vehicles Analyzed", str(data.get('vehicles_counted', 0))],
            ["Trees Offset", str(data.get('trees_offset', 0))],
            ["Avg Eco Score", f"{data.get('avg_eco_score', 0)}/100"],
        ]
        
        table = Table(metrics_data, colWidths=[2.5*inch, 2.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        story.append(table)
        story.append(Spacer(1, 0.2 * inch))
        
        # Recommendations
        story.append(Paragraph("Eco-Friendly Recommendations", styles['Heading2']))
        recommendations = [
            "Encourage use of public transportation during peak hours",
            "Optimize signal timings to reduce vehicle idling",
            "Promote carpooling and ride-sharing initiatives",
            "Implement congestion pricing in high-traffic zones",
            "Develop EV charging infrastructure",
        ]
        
        for rec in recommendations:
            story.append(Paragraph(f"• {rec}", styles['Normal']))
        
        doc.build(story)
        return filename
    
    def _generate_csv_sustainability_report(
        self,
        period: str,
        data: Dict[str, Any],
        filename: Path
    ) -> Path:
        """Generate CSV sustainability report."""
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            writer.writerow([f"Sustainability Report - {period.title()}"])
            writer.writerow(["Generated", datetime.now().isoformat()])
            writer.writerow([])
            
            writer.writerow(["Key Metrics"])
            for key, value in data.items():
                writer.writerow([key.replace("_", " ").title(), value])
            
            writer.writerow([])
            writer.writerow(["Recommendations"])
            recommendations = [
                "Encourage public transportation use",
                "Optimize signal timings",
                "Promote carpooling",
                "Implement congestion pricing",
                "Develop EV charging infrastructure",
            ]
            for rec in recommendations:
                writer.writerow([rec])
        
        return filename
    
    def generate_incident_report(
        self,
        incident_list: List[Dict[str, Any]],
        format: str = "pdf"
    ) -> Path:
        """Generate incident report."""
        filename = self.output_dir / f"incident_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
        
        if format == "csv":
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(["Incident Report"])
                writer.writerow(["Generated", datetime.now().isoformat()])
                writer.writerow([])
                writer.writerow(["Time", "Type", "Location", "Severity", "Status", "Description"])
                
                for incident in incident_list:
                    writer.writerow([
                        incident.get("timestamp", ""),
                        incident.get("type", ""),
                        incident.get("location", ""),
                        incident.get("severity", ""),
                        incident.get("status", ""),
                        incident.get("description", ""),
                    ])
        
        return filename
