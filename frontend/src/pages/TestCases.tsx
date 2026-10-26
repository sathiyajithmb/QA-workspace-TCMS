import {useEffect, useRef, useState} from 'react';
import {Field, Panel, SelectField, Table} from '../components/ui';

type Row = Record<string, any>;
type Props = {
  projectId: number;
  canWrite: boolean;
  api: (path: string, options?: RequestInit) => Promise<any>;
  onChanged: () => Promise<void>;
};
const priorities = ['Low','Medium','High','Critical'];

export default function TestCases({projectId, canWrite, api, onChanged}: Props) {
  const fileInput=useRef<HTMLInputElement>(null);
  const [cases,setCases]=useState<Row[]>([]);
  const [folders,setFolders]=useState<Row[]>([]);
  const [form,setForm]=useState<Row>({});
  const [caseId,setCaseId]=useState(0);
  const [selectedCases,setSelectedCases]=useState<number[]>([]);
  const [showArchived,setShowArchived]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [importResult,setImportResult]=useState<Row|null>(null);
  const [details,setDetails]=useState<Row|null>(null);
  const field=(name:string,label:string,type='text',required=false)=><Field key={name} name={name} label={label} type={type} required={required} value={form[name]??''} onChange={value=>setForm(prev=>({...prev,[name]:value}))}/>;
  const select=(name:string,label:string,options:string[])=><SelectField label={label} value={form[name]??''} onChange={value=>setForm(prev=>({...prev,[name]:value}))} items={options.map(value=>({value,label:value}))}/>;
  const post=(path:string,body:Row)=>api(path,{method:'POST',body:JSON.stringify(body)});
  const loadCases=async(path:string)=>{
    const result:Row[]=[];
    for(let offset=0;;offset+=500){
      const batch:Row[]=await api(`${path}&limit=500&offset=${offset}`);
      result.push(...batch);
      if(batch.length<500)return result;
    }
  };
  const refresh=async()=>{
    const [rows,folderRows]=await Promise.all([loadCases(`/cases?project_id=${projectId}${showArchived?'&include_archived=true':''}`),api(`/folders?project_id=${projectId}`)]);
    setCases(rows);setFolders(folderRows);
  };
  useEffect(()=>{
    if(!projectId)return;
    let cancelled=false;
    Promise.all([loadCases(`/cases?project_id=${projectId}${showArchived?'&include_archived=true':''}`),api(`/folders?project_id=${projectId}`)])
      .then(([rows,folderRows])=>{if(!cancelled){setCases(rows);setFolders(folderRows);}})
      .catch(reason=>{if(!cancelled)setError(String(reason));});
    return ()=>{cancelled=true;};
  },[api,projectId,showArchived]);
  const run=async(task:()=>Promise<unknown>,reload=true)=>{
    try{setError('');await task();if(reload){await refresh();await onChanged();}}
    catch(reason){setError(reason instanceof Error?reason.message:String(reason));}
  };
  const download=async(path:string,name:string)=>{
    await run(async()=>{const blob=await api(path) as Blob;const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);},false);
  };
  const importExcel=async(file:File)=>{
    if(busy||!projectId||!canWrite)return;
    setBusy(true);setError('');setImportResult(null);
    try{
      const body=new FormData();body.append('file',file);
      const result=await api(`/cases/import.xlsx?project_id=${projectId}`,{method:'POST',body});
      setImportResult({...result,filename:file.name});
      setForm({});setCaseId(0);setSelectedCases([]);setDetails(null);
      await refresh();await onChanged();
    }catch(reason){setError(reason instanceof Error?reason.message:String(reason));}
    finally{setBusy(false);}
  };
  const editCase=async(id:number)=>{
    const value=await api(`/cases/${id}`);
    const metadata=value.import_metadata??{};
    const steps:Row[]=value.steps??[];
    setCaseId(id);
    setForm({
      ...value,
      feature:metadata.feature??'',
      testType:metadata.test_type??'',
      actualResult:metadata.actual_result??'',
      sheetStatus:metadata.sheet_status??'',
      import_metadata:{
        ...metadata,
        test_steps:metadata.test_steps??steps.map(step=>step.action??'').filter(Boolean).join('\n'),
        expected_result:metadata.expected_result??steps.map(step=>step.expected??'').filter(Boolean).join('\n')
      },
      steps:JSON.stringify(steps,null,2),
      custom_values:JSON.stringify(value.custom_values??{},null,2)
    });
  };
  const setImportField=(name:string,value:string)=>setForm(previous=>({
    ...previous,
    import_metadata:{...(previous.import_metadata??{}),[name]:value}
  }));
  const buildCaseSteps=()=>{
    const metadata=form.import_metadata??{};
    const actions=String(metadata.test_steps??'').split(/\r?\n/)
      .map(line=>line.replace(/^\s*\d+[.)]\s*/,'').trim()).filter(Boolean);
    const expected=String(metadata.expected_result??'').trim();
    return actions.map((action,index)=>({action,expected:index===actions.length-1?expected:''}));
  };
  return <>
    {!projectId&&<Panel title="No project selected">Select a project to import test cases. Ask an administrator to grant you project access if the list is empty.</Panel>}
    {error&&<div className="error" role="alert">{error}</div>}
    {details&&<Panel title={`${details.import_metadata?.source_id||`TC-${details.id}`}: ${details.title}`}>
      {details.import_metadata?.feature&&<p><strong>Feature:</strong> {details.import_metadata.feature}</p>}
      {details.import_metadata?.test_type&&<p><strong>Test type:</strong> {details.import_metadata.test_type}</p>}
      {details.import_metadata?.test_steps&&<><strong>Imported test steps:</strong><pre>{details.import_metadata.test_steps}</pre></>}
      {details.import_metadata?.expected_result&&<p style={{whiteSpace:'pre-wrap'}}><strong>Imported expected result:</strong> {details.import_metadata.expected_result}</p>}
      {details.import_metadata?.actual_result&&<p><strong>Imported actual result:</strong> {details.import_metadata.actual_result}</p>}
      {details.import_metadata?.sheet_status&&<p><strong>Imported status:</strong> {details.import_metadata.sheet_status}</p>}
      <p><strong>Preconditions:</strong> {details.preconditions||'None'}</p>
      <Table headers={['Step','Action','Expected result']}>
        {(details.steps??[]).map((step:Row,index:number)=><tr key={index}><td>{index+1}</td><td>{step.action??''}</td><td>{step.expected??''}</td></tr>)}
      </Table>
      <button className="secondary" onClick={()=>setDetails(null)}>Close details</button>
    </Panel>}
      {projectId>0&&<><Panel title="Test repository" className="test-repository"><label><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Include archived cases</label><div className="grid"><Field name="caseSearch" label="Search title" value={form.caseSearch??''} onChange={v=>setForm(f=>({...f,caseSearch:v}))}/><SelectField label="Priority filter" value={form.priorityFilter??''} onChange={v=>setForm(f=>({...f,priorityFilter:v}))} items={priorities.map(x=>({value:x,label:x}))}/><SelectField label="Folder" value={form.folderFilter??''} onChange={v=>setForm(f=>({...f,folderFilter:v}))} items={[{value:'',label:'All folders'},...folders.map(f=>({value:f.id,label:f.name}))]}/><button onClick={()=>void loadCases(`/cases?project_id=${projectId}&q=${encodeURIComponent(form.caseSearch??'')}${form.priorityFilter?`&priority=${form.priorityFilter}`:''}${form.folderFilter?`&folder_id=${form.folderFilter}`:''}${showArchived?'&include_archived=true':''}`).then(setCases).catch(e=>setError(String(e)))}>Search</button></div><p>{cases.length} test cases shown. Scroll inside the table to view all rows and columns.</p><div className="case-sheet"><Table headers={['Select','Case ID','Feature','Test Scenario','Preconditions','Test Steps','Expected Result','Priority','Test Type','Actual Result','Sheet Status','Case Status','Version','Actions']}>{cases.map(c=><tr key={c.id}><td><input type="checkbox" checked={selectedCases.includes(c.id)} onChange={e=>setSelectedCases(prev=>e.target.checked?[...prev,c.id]:prev.filter(id=>id!==c.id))}/></td><td>{c.import_metadata?.source_id||`TC-${c.id}`}{importResult?.case_ids?.includes(c.id)&&<small> (Imported)</small>}</td><td>{c.import_metadata?.feature||'-'}</td><td><button className="secondary" onClick={()=>void run(async()=>setDetails(await api(`/cases/${c.id}`)),false)}>{c.title}</button></td>
          <td className="case-content">{c.preconditions||'-'}</td>
          <td className="case-content">{(c.steps??[]).map((step:Row,index:number)=>`${index+1}. ${step.action??''}`).join('\n')||c.import_metadata?.test_steps||'-'}</td>
          <td className="case-content">{(c.steps??[]).map((step:Row)=>step.expected??'').filter(Boolean).join('\n')||c.import_metadata?.expected_result||'-'}</td>
          <td>{c.priority}</td><td>{c.import_metadata?.test_type||c.kind}</td><td>{c.import_metadata?.actual_result||'-'}</td><td>{c.import_metadata?.sheet_status||'-'}</td><td>{c.status}{c.archived?' · Archived':''}</td><td>v{c.version}</td><td>{c.archived?<button disabled={!canWrite} onClick={()=>void run(()=>api(`/cases/${c.id}/restore`,{method:'POST'}))}>Restore</button>:<button disabled={!canWrite} onClick={()=>void editCase(c.id).catch(e=>setError(String(e)))}>Edit</button>} <button className="secondary" onClick={()=>void api(`/cases/${c.id}/versions`).then(v=>setForm(f=>({...f,versionHistory:v}))).catch(e=>setError(String(e)))}>History</button></td></tr>)}</Table></div><div className="buttons"><button disabled={!canWrite||busy} className="danger" onClick={()=>void run(()=>post('/cases/bulk-archive',{project_id:projectId,case_ids:selectedCases}))}>Archive selected</button><button className="secondary" onClick={()=>void download(`/cases/export/xlsx?project_id=${projectId}`,'test-cases.xlsx')}>Export Excel</button></div>{form.versionHistory&&<pre>{JSON.stringify(form.versionHistory,null,2)}</pre>}</Panel>
        {canWrite&&<Panel title={caseId?`Edit test case TC-${caseId}`:'Create test case'}>
          {field('title','Test Scenario','text',true)}
          {field('feature','Feature')}
          <div className="grid">
            {select('priority','Priority',priorities)}
            {select('kind','Case kind',['Manual','Automated','Both'])}
            {select('status','Case status',['Active','Draft','Deprecated'])}
            <SelectField label="Folder" value={form.folder_id??''} onChange={v=>setForm(f=>({...f,folder_id:v?Number(v):null}))} items={folders.map(f=>({value:f.id,label:f.name}))}/>
          </div>
          <label>Preconditions<textarea value={form.preconditions??''} onChange={e=>setForm(f=>({...f,preconditions:e.target.value}))}/></label>
          <label>Test Steps (one step per line)<textarea rows={4} value={form.import_metadata?.test_steps??''} onChange={e=>setImportField('test_steps',e.target.value)}/></label>
          <label>Expected Result<textarea value={form.import_metadata?.expected_result??''} onChange={e=>setImportField('expected_result',e.target.value)}/></label>
          <div className="grid">
            {field('testType','Test Type')}
            {field('actualResult','Actual Result')}
            {field('sheetStatus','Sheet Status')}
          </div>
          <label>Custom field values (JSON)<textarea rows={3} value={form.custom_values??'{}'} onChange={e=>setForm(f=>({...f,custom_values:e.target.value}))}/></label>
          <div className="buttons"><button onClick={()=>void run(async()=>{
            const steps=buildCaseSteps();
            const metadata={
              ...(form.import_metadata??{}),
              feature:String(form.feature??'').trim(),
              test_type:String(form.testType??'').trim(),
              actual_result:String(form.actualResult??'').trim(),
              sheet_status:String(form.sheetStatus??'').trim(),
              expected_result:String(form.import_metadata?.expected_result??'').trim(),
              test_steps:String(form.import_metadata?.test_steps??'').trim()
            };
            const body={project_id:projectId,title:form.title,priority:form.priority||'Medium',kind:form.kind||'Manual',status:form.status||'Active',folder_id:form.folder_id||null,preconditions:form.preconditions||'',steps,custom_values:JSON.parse(form.custom_values||'{}'),import_metadata:metadata};
            await (caseId?api(`/cases/${caseId}`,{method:'PUT',body:JSON.stringify(body)}):post('/cases',body));
            setCaseId(0);setForm({});
          })}>{caseId?'Save new version':'Create case'}</button><button className="secondary" onClick={()=>{setCaseId(0);setForm({});}}>Clear</button></div>
          <div className="grid">{field('folderName','New folder')}<button onClick={()=>void run(()=>api(`/folders?project_id=${projectId}&name=${encodeURIComponent(String(form.folderName??''))}`,{method:'POST'}))}>Add folder</button></div>
        </Panel>}</>}
    <Panel title="Excel import">
      <button type="button" disabled={!projectId||!canWrite||busy} aria-describedby="excel-import-help" onClick={()=>fileInput.current?.click()}>{busy?'Importing...':'Import Excel'}</button>
      <input ref={fileInput} type="file" accept=".xlsx" style={{display:'none'}} disabled={!projectId||!canWrite||busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void importExcel(file);}}/>
      <p id="excel-import-help">{!projectId?'Select a project from Workspace first. If the list is empty, an administrator must add you to a project with the Tester role or higher.':!canWrite?'Import requires the Tester role or higher in this project.':'Choose an Excel workbook to save its test cases to the selected project.'}</p>
      <p>Upload an .xlsx workbook up to 5 MB. Your worksheet can use: -, Feature, Test Scenario, Preconditions, Test Steps, Expected Result, Priority, Test Type, Actual Result and Status.</p>
      <p>Test Steps can contain numbered lines of plain text. The original title / priority / kind format with JSON steps is also supported.</p>
      <p>Spreadsheet results are displayed as imported information. Record execution attempts separately in Execution.</p>
      <p>All imported columns appear in the table above. Scroll horizontally to see every column, or click a title to open the case details.</p>
      {projectId>0&&!canWrite&&<p>Your project role allows viewing only. Ask an administrator for permission to import or edit cases.</p>}
      {busy&&<p role="status">Importing workbook...</p>}
      {importResult&&<div role="status">
        <p><strong>{importResult.filename}</strong>: {importResult.imported} imported, {importResult.errors.length} rows skipped.</p>
        {importResult.errors.length>0&&<Table headers={['Excel row','Reason']}>
          {importResult.errors.map((item:Row)=><tr key={item.row}><td>{item.row}</td><td>{item.error}</td></tr>)}
        </Table>}
      </div>}
    </Panel>
  </>;
}
