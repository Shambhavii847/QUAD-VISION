import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import {
  getSubjects,
  getUnits,
  getTopics,
  getTimetable,
  getHolidays,
  getSemesters,
  getUsers,
  createTopic,
  createUnit,
  saveTimetableEntry,
  addHoliday,
  triggerPlannedDatesRecalculation,
} from '../../services/storage';
import { BranchId, Unit } from '../../types';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  FileCheck,
  RefreshCw,
  Building2,
} from 'lucide-react';

type CsvType = 'topics' | 'timetable' | 'holidays';

export const CsvImporter: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<BranchId>('Ghaziabad');
  const [csvType, setCsvType] = useState<CsvType>('topics');
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const subjects = getSubjects();
  const semesters = getSemesters();
  const users = getUsers();

  const sampleTemplates: Record<CsvType, { filename: string; text: string; description: string }> = {
    topics: {
      filename: 'sample_topics_syllabus.csv',
      text: `subject_code,unit_number,unit_title,topic_title,planned_hours,sequence_order,in_exam_scope
CS301,5,Advanced Graph Heuristics,A* Pathfinding & Euclidean Metric,3.0,17,true
CS301,5,Advanced Graph Heuristics,Bellman-Ford & Negative Cycles,2.5,18,true
CS302,4,Distributed Transactions,Two-Phase Commit Protocol,3.0,13,true
CS303,4,Wireless & Sensor Networks,802.11 MAC Protocol & CSMA/CA,3.0,15,true`,
      description: 'Upload syllabus topics including Subject Code, Unit Number, Topic Title, and Planned Teaching Hours.',
    },
    timetable: {
      filename: 'sample_timetable_slots.csv',
      text: `subject_code,day_of_week,start_time,end_time,duration_hours,room,faculty_email
CS301,6,10:00,11:30,1.5,LH-201,radhika@msot.edu
CS302,6,11:30,13:00,1.5,LH-202,arvind@msot.edu
CS303,1,14:00,15:30,1.5,NET-LAB,priya@msot.edu`,
      description: 'Upload weekly recurring timetable slots with Day of Week (1=Mon ... 6=Sat), Duration, Room, and Faculty Email.',
    },
    holidays: {
      filename: 'sample_academic_holidays.csv',
      text: `date,holiday_name,is_non_teaching
2026-10-08,Institutional Innovation Day,true
2026-11-14,Children's Day & University Sports,true
2026-11-25,Guru Nanak Jayanti,true`,
      description: 'Upload institutional holidays and non-teaching days. Dates trigger automatic schedule recalculation.',
    },
  };

  const handleLoadSample = (type: CsvType) => {
    setCsvRawText(sampleTemplates[type].text);
    handleParseCsv(sampleTemplates[type].text, type);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvRawText(content);
      handleParseCsv(content, csvType);
    };
    reader.readAsText(file);
  };

  const handleParseCsv = (text: string, type: CsvType) => {
    setParseErrors([]);
    setParsedRows([]);
    setImportNotice(null);

    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    if (lines.length < 2) {
      setParseErrors(['CSV must contain a header row and at least one data row.']);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const dataRows: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: expected ${headers.length} columns, found ${values.length}.`);
        continue;
      }

      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx];
      });

      // Specific validations
      if (type === 'topics') {
        const sub = subjects.find(
          (s) => s.code.toLowerCase() === rowObj.subject_code?.toLowerCase()
        );
        if (!sub) {
          errors.push(`Row ${i + 1}: Subject with code "${rowObj.subject_code}" not found.`);
        }
        const hours = parseFloat(rowObj.planned_hours);
        if (isNaN(hours) || hours <= 0) {
          errors.push(`Row ${i + 1}: Planned hours must be a positive number.`);
        }
      } else if (type === 'timetable') {
        const sub = subjects.find(
          (s) => s.code.toLowerCase() === rowObj.subject_code?.toLowerCase()
        );
        if (!sub) {
          errors.push(`Row ${i + 1}: Subject "${rowObj.subject_code}" not found.`);
        }
        const day = parseInt(rowObj.day_of_week);
        if (isNaN(day) || day < 1 || day > 6) {
          errors.push(`Row ${i + 1}: day_of_week must be between 1 (Monday) and 6 (Saturday).`);
        }
      } else if (type === 'holidays') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rowObj.date)) {
          errors.push(`Row ${i + 1}: Invalid date format "${rowObj.date}". Expected YYYY-MM-DD.`);
        }
      }

      dataRows.push(rowObj);
    }

    setParseErrors(errors);
    setParsedRows(dataRows);
  };

  const handleCommitImport = () => {
    if (!currentUser || parsedRows.length === 0 || parseErrors.length > 0) return;

    let importedCount = 0;

    if (csvType === 'topics') {
      const existingUnits = getUnits();
      const existingTopics = getTopics();

      parsedRows.forEach((row) => {
        const sub = subjects.find(
          (s) => s.code.toLowerCase() === row.subject_code?.toLowerCase()
        );
        if (!sub) return;

        // Find or create Unit
        const unitNum = parseInt(row.unit_number) || 1;
        let unit: Unit | null | undefined = existingUnits.find(
          (u) => u.subject_id === sub.id && u.unit_number === unitNum
        );
        if (!unit) {
          unit = createUnit(
            {
              subject_id: sub.id,
              unit_number: unitNum,
              title: row.unit_title || `Unit ${unitNum}`,
              description: `Imported Unit ${unitNum} for ${sub.code}`,
            },
            currentUser
          );
        }

        if (!unit) return;

        const seq = parseInt(row.sequence_order) || existingTopics.length + 1;
        createTopic(
          {
            unit_id: unit.id,
            subject_id: sub.id,
            title: row.topic_title,
            planned_hours: parseFloat(row.planned_hours) || 2.0,
            sequence_order: seq,
            status: 'not_started',
            completion_percentage: 0,
            in_exam_scope: row.in_exam_scope !== 'false',
          },
          currentUser
        );
        importedCount++;
        triggerPlannedDatesRecalculation(sub.id, currentUser);
      });

      setImportNotice(`Successfully imported ${importedCount} topics and recalculated delivery dates!`);
    } else if (csvType === 'timetable') {
      const sem = semesters[0];
      parsedRows.forEach((row) => {
        const sub = subjects.find(
          (s) => s.code.toLowerCase() === row.subject_code?.toLowerCase()
        );
        if (!sub) return;
        const faculty = users.find((u) => u.email === row.faculty_email) || users.find((u) => u.id === sub.faculty_id);

        saveTimetableEntry(
          {
            batch_id: sub.batch_id,
            branch_id: selectedBranch,
            campus_id: selectedBranch,
            subject_id: sub.id,
            day_of_week: parseInt(row.day_of_week),
            start_time: row.start_time,
            end_time: row.end_time,
            duration_hours: parseFloat(row.duration_hours) || 1.5,
            room: row.room || 'LH-101',
            faculty_id: faculty?.id || sub.faculty_id,
          },
          currentUser
        );
        importedCount++;
      });
      setImportNotice(`Successfully imported ${importedCount} timetable teaching slots for ${selectedBranch}!`);
    } else if (csvType === 'holidays') {
      const sem = semesters.find(s => s.branch_id === selectedBranch) || semesters[0];
      parsedRows.forEach((row) => {
        addHoliday(
          {
            semester_id: sem?.id || 'sem-gzb-mirai',
            branch_id: selectedBranch,
            campus_id: selectedBranch,
            date: row.date,
            name: row.holiday_name,
            is_non_teaching: row.is_non_teaching !== 'false',
          },
          currentUser
        );
        importedCount++;
      });
      setImportNotice(`Successfully imported ${importedCount} holidays for ${selectedBranch}!`);
    }

    setParsedRows([]);
    setCsvRawText('');
  };

  const handleDownloadTemplate = () => {
    const template = sampleTemplates[csvType];
    const blob = new Blob([template.text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', template.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Importer Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EFE8DC] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE8DC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FEF9E7] border border-[#FBE69B] text-[#644B00] flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5 text-[#644B00]" />
            </div>
            <div>
              <h3 className="font-bold text-[#1C1917] text-base tracking-tight">
                Academic CSV Bulk Ingestion
              </h3>
              <p className="text-xs text-[#78716C]">
                Bulk import course syllabus, timetable slots, and holidays with live schema validation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-1.5 rounded-full border border-[#EFE8DC] bg-[#FAF7F0] hover:bg-white text-[#1C1917] font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-[#78716C]" />
              <span>Download Template</span>
            </button>
            <button
              onClick={() => handleLoadSample(csvType)}
              className="px-4 py-1.5 rounded-full bg-[#1C1917] hover:bg-black text-[#FBE69B] font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <FileCheck className="w-3.5 h-3.5 text-[#FBE69B]" />
              <span>Load Sample Data</span>
            </button>
          </div>
        </div>

        {importNotice && (
          <div className="mt-4 p-3.5 rounded-2xl bg-[#EEF7EF] border border-[#C8E8CD] text-[#2D451B] font-medium text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#557B2F] shrink-0" />
            <span>{importNotice}</span>
          </div>
        )}

        {/* Type Selector Tabs & Branch Target */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'topics', label: '1. Syllabus Topics CSV' },
              { id: 'timetable', label: '2. Timetable Slots CSV' },
              { id: 'holidays', label: '3. Academic Holidays CSV' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setCsvType(tab.id as CsvType);
                  setParsedRows([]);
                  setParseErrors([]);
                  setCsvRawText('');
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  csvType === tab.id
                    ? 'bg-[#1C1917] text-white shadow-2xs'
                    : 'bg-[#FAF7F0] text-[#78716C] hover:text-[#1C1917] hover:bg-white border border-[#EFE8DC]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF7F0] border border-[#EFE8DC] text-xs">
            <Building2 className="w-3.5 h-3.5 text-[#78716C]" />
            <span className="font-semibold text-[#78716C] text-[11px]">Target Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value as BranchId)}
              className="bg-transparent font-semibold text-[#1C1917] focus:outline-hidden cursor-pointer"
            >
              <option value="Ghaziabad">Ghaziabad (AKTU)</option>
              <option value="Bangalore">Bangalore (VTU)</option>
              <option value="Jaipur">Jaipur (Jagannath Univ)</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-[#78716C] mt-3">
          {sampleTemplates[csvType].description}
        </p>

        {/* Drag / File Upload & Text Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#1C1917]">
                Paste Raw CSV Text
              </label>
              <label className="text-[11px] font-semibold text-[#1C1917] hover:text-[#701A4A] cursor-pointer flex items-center gap-1">
                <Upload className="w-3 h-3 text-[#78716C]" />
                <span>Upload .csv file</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              rows={8}
              value={csvRawText}
              onChange={(e) => {
                setCsvRawText(e.target.value);
                handleParseCsv(e.target.value, csvType);
              }}
              placeholder={`Paste your ${csvType} CSV content here...`}
              className="w-full p-3.5 bg-[#FAF7F0]/50 border border-[#EFE8DC] rounded-2xl text-xs font-mono text-[#1C1917] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#1C1917]/20 transition-all shadow-2xs"
            />
          </div>

          {/* Validation Status & Live Preview Summary */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#1C1917] block">
              Validation & Schema Preview
            </label>
            <div className="p-4 bg-[#FAF7F0]/40 border border-[#EFE8DC] rounded-2xl h-[178px] overflow-y-auto space-y-2 text-xs">
              {parseErrors.length > 0 ? (
                <div className="space-y-1">
                  <div className="font-semibold text-[#701A4A] flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-[#701A4A]" />
                    <span>Validation Errors Detected ({parseErrors.length}):</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-[#701A4A] space-y-0.5">
                    {parseErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : parsedRows.length > 0 ? (
                <div className="space-y-2">
                  <div className="font-semibold text-[#2D451B] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#557B2F]" />
                    <span>Schema Valid: {parsedRows.length} rows ready for database commit</span>
                  </div>
                  <p className="text-[11px] text-[#78716C]">
                    All columns matched expected entities and academic constraints.
                  </p>
                  <button
                    onClick={handleCommitImport}
                    className="w-full py-2.5 rounded-full bg-[#1C1917] hover:bg-black text-[#FBE69B] font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#FBE69B]" />
                    <span>Commit & Import {parsedRows.length} Rows</span>
                  </button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#78716C]">
                  <FileSpreadsheet className="w-6 h-6 text-[#A8A29E] mb-1" />
                  <span>No data loaded yet. Click "Load Sample Data" or paste CSV.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Data Preview Table */}
        {parsedRows.length > 0 && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1917]">
                Parsed Rows Preview ({parsedRows.length} records)
              </span>
            </div>
            <div className="overflow-x-auto border border-[#EFE8DC] rounded-2xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F0] text-[#78716C] font-semibold border-b border-[#EFE8DC]">
                  <tr>
                    {Object.keys(parsedRows[0] || {}).map((col) => (
                      <th key={col} className="py-2.5 px-3 uppercase tracking-wider text-[10px]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DC]/60">
                  {parsedRows.map((row, i) => (
                    <tr key={i} className="hover:bg-[#FAF7F0]/40 transition-colors">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="py-2 px-3 text-[#1C1917] font-medium text-[11px]">
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
