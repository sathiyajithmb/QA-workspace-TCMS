"""Dashboard API: summary counts, filters, and recent activity."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .models import User, TestCase, TestPlan, Cycle, CycleCase, Execution, Defect


def data(record):
    return {column.name: getattr(record, column.name) for column in record.__table__.columns}


def create_dashboard_router(db, user, accessible, project_for_cycle):
    """Receive shared session/auth dependencies from the application entry point."""
    router = APIRouter(prefix='/api', tags=['Dashboard'])

    @router.get('/dashboard')
    def dashboard(project_id: int, cycle_id: Optional[int] = None,
                  release: Optional[str] = None,
                  s: Session = Depends(db), u: User = Depends(user)):
        accessible(s,u,project_id)
        case_count=s.scalar(select(func.count()).select_from(TestCase).where(TestCase.project_id==project_id,TestCase.archived==False))
        case_statuses={'Pass':0,'Fail':0,'In Progress':0,'Skip':0,'Block':0}
        status_aliases={
            'pass':'Pass','passed':'Pass',
            'fail':'Fail','failed':'Fail',
            'in progress':'In Progress','inprogress':'In Progress','pending':'In Progress',
            'skip':'Skip','skipped':'Skip',
            'block':'Block','blocked':'Block',
        }
        for value in s.scalars(select(TestCase.import_metadata).where(TestCase.project_id==project_id,TestCase.archived==False)).all():
            result=str((value or {}).get('actual_result') or '').strip()
            normalized=' '.join(result.casefold().replace('_',' ').replace('-',' ').split())
            status=status_aliases.get(normalized)
            if status:
                case_statuses[status]+=1
        defects=s.scalars(select(Defect).where(Defect.project_id==project_id)).all()
        cycle_query=select(Cycle.id).join(TestPlan).where(TestPlan.project_id==project_id)
        if release is not None: cycle_query=cycle_query.where(TestPlan.release==release)
        if cycle_id is not None:
            if project_for_cycle(s,cycle_id)!=project_id: raise HTTPException(400,'Cycle belongs to another project')
            cycle_query=cycle_query.where(Cycle.id==cycle_id)
        cycle_ids=s.scalars(cycle_query).all()
        entries=s.scalars(select(Execution).join(CycleCase).where(CycleCase.cycle_id.in_(cycle_ids))).all() if cycle_ids else []
        cycle_items=s.scalars(select(CycleCase).where(CycleCase.cycle_id.in_(cycle_ids))).all() if cycle_ids else []
        latest={item.id:s.scalar(select(Execution.status).where(Execution.cycle_case_id==item.id).order_by(Execution.id.desc()).limit(1)) for item in cycle_items}
        statuses={k:sum(status==k for status in latest.values()) for k in ('Passed','Failed','Blocked','Skipped')}
        statuses['Not Run']=sum(status is None for status in latest.values())
        completed=sum(status is not None for status in latest.values())
        recent=s.scalars(select(Execution).join(CycleCase).where(CycleCase.cycle_id.in_(cycle_ids)).order_by(Execution.created_at.desc()).limit(10)).all() if cycle_ids else []
        return {'cases':case_count,'case_statuses':case_statuses,'executions':len(entries),'statuses':statuses,'open_defects':sum(d.status!='Closed' for d in defects),'defects_by_severity':{k:sum(d.status!='Closed' and d.severity==k for d in defects) for k in ('Critical','High','Medium','Low')},'cycles':len(cycle_ids),'progress':(completed/len(cycle_items) if cycle_items else 0),'recent_activity':[data(e) for e in recent],'recent_defects':[data(d) for d in defects[-5:]]}

    return router
