import { formatDate } from "@/lib/format";

export type CellValue = string | number | Date | null | undefined;

export type CellInput =
  | CellValue
  | {
      value?: CellValue;
      style?: string;
      mergeAcross?: number;
    };

export type ExcelRow =
  | CellInput[]
  | {
      cells: CellInput[];
      height?: number;
    };

export type ExcelSheet = {
  name: string;
  columns?: number[];
  rows: ExcelRow[];
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sheetName(name: string) {
  return escapeXml(name.slice(0, 31));
}

function isCellObject(value: CellInput): value is Exclude<CellInput, CellValue> {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Date) &&
    ("value" in value || "style" in value || "mergeAcross" in value)
  );
}

function cell(input: CellInput) {
  const value = isCellObject(input) ? input.value : input;
  const style = isCellObject(input) ? input.style : undefined;
  const mergeAcross = isCellObject(input) ? input.mergeAcross : undefined;
  const styleAttribute = style ? ` ss:StyleID="${escapeXml(style)}"` : "";
  const mergeAttribute =
    typeof mergeAcross === "number" ? ` ss:MergeAcross="${mergeAcross}"` : "";

  if (value instanceof Date) {
    return `<Cell${styleAttribute || ' ss:StyleID="Date"'}${mergeAttribute}><Data ss:Type="String">${escapeXml(
      formatDate(value)
    )}</Data></Cell>`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell${styleAttribute}${mergeAttribute}><Data ss:Type="Number">${value}</Data></Cell>`;
  }

  return `<Cell${styleAttribute}${mergeAttribute}><Data ss:Type="String">${escapeXml(
    String(value ?? "")
  )}</Data></Cell>`;
}

function worksheet(sheet: ExcelSheet) {
  const columns = (sheet.columns ?? [])
    .map((width) => `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`)
    .join("");
  const rows = sheet.rows
    .map((row) => {
      const cells = Array.isArray(row) ? row : row.cells;
      const height = !Array.isArray(row) && row.height ? ` ss:Height="${row.height}"` : "";

      return `<Row${height}>${cells.map(cell).join("")}</Row>`;
    })
    .join("");

  return `<Worksheet ss:Name="${sheetName(sheet.name)}"><Table>${columns}${rows}</Table></Worksheet>`;
}

export function titleRow(title: string, mergeAcross: number): ExcelRow {
  return {
    height: 28,
    cells: [{ value: title, style: "Title", mergeAcross }],
  };
}

export function subtitleRow(subtitle: string, mergeAcross: number): ExcelRow {
  return {
    height: 20,
    cells: [{ value: subtitle, style: "Subtitle", mergeAcross }],
  };
}

export function sectionRow(title: string, mergeAcross: number): ExcelRow {
  return {
    height: 22,
    cells: [{ value: title, style: "Section", mergeAcross }],
  };
}

export function blankRow(): ExcelRow {
  return [""];
}

export function headerCell(value: CellValue): CellInput {
  return { value, style: "Header" };
}

export function textCell(value: CellValue): CellInput {
  return { value, style: "Text" };
}

export function dateCell(value: Date): CellInput {
  return { value, style: "Date" };
}

export function numberCell(value: number): CellInput {
  return { value, style: "Number" };
}

export function moneyCell(value: number): CellInput {
  return { value, style: "Money" };
}

export function debitCell(value: number): CellInput {
  return { value, style: "DebitMoney" };
}

export function creditCell(value: number): CellInput {
  return { value, style: "CreditMoney" };
}

export function totalLabelCell(value: CellValue): CellInput {
  return { value, style: "TotalLabel" };
}

export function totalMoneyCell(value: number): CellInput {
  return { value, style: "TotalMoney" };
}

export function totalNumberCell(value: number): CellInput {
  return { value, style: "TotalNumber" };
}

export function statusCell(status: string): CellInput {
  const normalized = status.toUpperCase();
  if (normalized === "LUNAS") return { value: status, style: "StatusPaid" };
  if (normalized === "BELUM LUNAS") return { value: status, style: "StatusUnpaid" };
  if (normalized === "BATAL") return { value: status, style: "StatusCanceled" };

  return textCell(status);
}

export function typeCell(type: string): CellInput {
  if (type === "Debit") return { value: type, style: "DebitLabel" };
  if (type === "Kredit") return { value: type, style: "CreditLabel" };
  if (type === "Batal") return { value: type, style: "CanceledLabel" };

  return textCell(type);
}

export function accountingWorkbook(sheets: ExcelSheet[]) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1F2937"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
      </Borders>
    </Style>
    <Style ss:ID="Title">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#17365D" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Subtitle">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Section">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#305496" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1F4E78" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#17365D"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2EC"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#17365D"/>
      </Borders>
    </Style>
    <Style ss:ID="Text">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Date">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Number">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <NumberFormat ss:Format="#,##0"/>
    </Style>
    <Style ss:ID="Money">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <NumberFormat ss:Format="&quot;Rp&quot; #,##0"/>
    </Style>
    <Style ss:ID="DebitMoney">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#166534"/>
      <Interior ss:Color="#ECFDF3" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="&quot;Rp&quot; #,##0"/>
    </Style>
    <Style ss:ID="CreditMoney">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#9A3412"/>
      <Interior ss:Color="#FFF7ED" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="&quot;Rp&quot; #,##0"/>
    </Style>
    <Style ss:ID="DebitLabel">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#166534"/>
      <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CreditLabel">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#9A3412"/>
      <Interior ss:Color="#FFEDD5" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="CanceledLabel">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>
      <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="StatusPaid">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#166534"/>
      <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="StatusUnpaid">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#92400E"/>
      <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="StatusCanceled">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>
      <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="TotalLabel">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#17365D"/>
      <Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#17365D"/>
      </Borders>
    </Style>
    <Style ss:ID="TotalMoney">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#17365D"/>
      <Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="&quot;Rp&quot; #,##0"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#17365D"/>
      </Borders>
    </Style>
    <Style ss:ID="TotalNumber">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#17365D"/>
      <Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#17365D"/>
      </Borders>
    </Style>
  </Styles>
  ${sheets.map(worksheet).join("")}
</Workbook>`;
}
