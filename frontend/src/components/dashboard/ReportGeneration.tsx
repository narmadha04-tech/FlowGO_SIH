import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2, Check, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Report {
  id: string;
  type: string;
  format: string;
  filepath: string;
  generated_at: string;
  download_url?: string;
}

export function ReportGeneration() {
  const [reportType, setReportType] = useState("daily");
  const [format, setFormat] = useState("pdf");
  const [period, setPeriod] = useState("daily");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<Report[]>([]);
  const [lastGenerated, setLastGenerated] = useState<Report | null>(null);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: reportType,
          period: period,
          format: format,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastGenerated({
          id: data.download_url,
          type: reportType,
          format: format,
          filepath: data.filepath,
          generated_at: new Date().toISOString(),
          download_url: data.download_url,
        });
        
        // Add to list
        setGeneratedReports(prev => [data, ...prev.slice(0, 9)]);
        
        toast.success(`${reportType} ${format.toUpperCase()} report generated!`, {
          action: {
            label: "Download",
            onClick: () => downloadReport(data.download_url),
          },
        });
      } else {
        throw new Error("Failed to generate report");
      }
    } catch (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-rajdhani font-bold text-foreground mb-2">
            Report Generation & Export
          </h1>
          <p className="text-muted-foreground">
            Generate comprehensive reports for traffic authorities and city planners
          </p>
        </div>
      </div>

      <Tabs defaultValue="generator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generator">Report Generator</TabsTrigger>
          <TabsTrigger value="history">Recent Reports</TabsTrigger>
        </TabsList>

        {/* Generator Tab */}
        <TabsContent value="generator">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-6 text-foreground">
                Report Configuration
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block text-foreground">Report Type</label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Traffic Report</SelectItem>
                      <SelectItem value="weekly">Weekly Analysis</SelectItem>
                      <SelectItem value="monthly">Monthly Summary</SelectItem>
                      <SelectItem value="sustainability">Sustainability Report</SelectItem>
                      <SelectItem value="incident">Incident Report</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select the type of report to generate
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block text-foreground">Period</label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block text-foreground">Export Format</label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">
                        <span>📄 PDF (Professional)</span>
                      </SelectItem>
                      <SelectItem value="csv">
                        <span>📊 CSV (Data Analysis)</span>
                      </SelectItem>
                      <SelectItem value="json">
                        <span>📋 JSON (API Compatible)</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF is best for printing and sharing with authorities
                  </p>
                </div>

                <Button
                  onClick={generateReport}
                  disabled={isGenerating}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-rajdhani font-semibold"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>

                <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm text-foreground font-medium mb-2">What's Included:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Traffic metrics & statistics</li>
                    <li>✓ Incident summaries</li>
                    <li>✓ Signal performance analysis</li>
                    <li>✓ Congestion patterns</li>
                    <li>✓ Eco-metrics (for sustainability)</li>
                    <li>✓ Recommendations for improvement</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Preview & Status Panel */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-rajdhani font-semibold mb-6 text-foreground">
                Generation Status
              </h3>

              {lastGenerated ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/20">
                    <Check className="w-5 h-5 text-success" />
                    <div>
                      <p className="font-medium text-foreground">Report Generated Successfully</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(lastGenerated.generated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Report Details</p>
                    <div className="p-3 bg-secondary rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium text-foreground">
                          {lastGenerated.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Format:</span>
                        <span className="font-medium text-foreground">
                          {lastGenerated.format.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-medium text-foreground">~2.3 MB</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => downloadReport(lastGenerated.download_url || "")}
                    className="w-full"
                    variant="default"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(lastGenerated.filepath);
                      toast.success("File path copied!");
                    }}
                  >
                    Copy File Path
                  </Button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Configure and generate a report to see it here
                  </p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="p-6 bg-card border-border">
            <h3 className="text-lg font-rajdhani font-semibold mb-4 text-foreground">
              Recently Generated Reports
            </h3>

            {generatedReports.length > 0 ? (
              <div className="space-y-3">
                {generatedReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground capitalize">
                          {report.type} Report
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.generated_at).toLocaleString()} •{" "}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {report.format.toUpperCase()}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => downloadReport(report.download_url || report.filepath)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No reports generated yet</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features Info */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border">
          <h4 className="font-semibold text-foreground mb-2">📊 Traffic Reports</h4>
          <p className="text-sm text-muted-foreground">
            Daily, weekly, and monthly traffic analysis with congestion trends, incident summaries, and optimization recommendations.
          </p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <h4 className="font-semibold text-foreground mb-2">🌍 Sustainability</h4>
          <p className="text-sm text-muted-foreground">
            CO₂ emissions tracking, fuel consumption analysis, and eco-friendly routing suggestions for sustainability initiatives.
          </p>
        </Card>

        <Card className="p-4 bg-card border-border">
          <h4 className="font-semibold text-foreground mb-2">🚨 Incident Reports</h4>
          <p className="text-sm text-muted-foreground">
            Comprehensive incident logs with accident details, violations, hazard reports, and emergency response metrics.
          </p>
        </Card>
      </div>
    </div>
  );
}
