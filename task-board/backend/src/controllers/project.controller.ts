import type { Request, Response, NextFunction } from 'express';
import * as projectService from '../services/projectService.js';
import { CreateProjectInput } from '../schemas.js';

function requireParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`Missing route param: ${name}`);
  }
  return v;
}

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'workspaceId');
    const parsedBody = CreateProjectInput.parse(req.body);
    if (!req.userId) {
      res.status(401).json({ success: false, message: 'Unauthenticated', errorCode: 'UNAUTHENTICATED' });
      return;
    }

    const project = await projectService.createProject(
      workspaceId,
      req.userId,
      parsedBody.name,
      parsedBody.description,
      parsedBody.status
    );

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectsForWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = requireParam(req, 'workspaceId');
    const projects = await projectService.getProjectsForWorkspace(workspaceId);

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = requireParam(req, 'id');
    const project = await projectService.getProjectById(projectId);

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found',
        errorCode: 'NOT_FOUND',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = requireParam(req, 'id');
    const parsedBody = CreateProjectInput.partial().parse(req.body);

    const project = await projectService.updateProject(projectId, parsedBody);

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = requireParam(req, 'id');
    await projectService.deleteProject(projectId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
