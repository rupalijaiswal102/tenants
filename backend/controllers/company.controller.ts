import { Request, Response } from 'express';
import { Company } from '../models/Company';
import { mockStorage, isUsingMockData } from '../src/mockData';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

// ── Shared helper: upload one file to Cloudinary (or base64 fallback) ─────────
const uploadFile = async (file: any, folder: string): Promise<string | null> => {
  if (!file) return null;
  if (!isCloudinaryConfigured) {
    const base64 = fs.readFileSync(file.path, { encoding: 'base64' });
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return `data:${file.mimetype};base64,${base64}`;
  }
  const result = await cloudinary.uploader.upload(file.path, {
    folder,
    resource_type: 'auto',
    public_id: `${Date.now()}-${file.originalname.split('.')[0].replace(/\s+/g, '_')}`,
  });
  if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  return result.secure_url;
};

// ── Helper: extract files from req.files (upload.fields) ─────────────────────
const getFiles = (req: Request) => {
  const files = (req as any).files || {};
  return {
    logoFile: Array.isArray(files['logoFile']) ? files['logoFile'][0] : files['logoFile'],
    sealFile: Array.isArray(files['sealFile']) ? files['sealFile'][0] : files['sealFile'],
  };
};

// ── GET all ───────────────────────────────────────────────────────────────────
export const getCompanies = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) return res.json(mockStorage.companies);
    const companies = await Company.find().sort({ companyName: 1 });
    res.json(companies.map(c => ({ ...c.toObject(), id: c._id })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

// ── GET one ───────────────────────────────────────────────────────────────────
export const getCompanyById = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      const c = mockStorage.companies.find((c: any) => c.id === req.params.id);
      if (!c) return res.status(404).json({ error: 'Not found' });
      return res.json(c);
    }
    const c = await Company.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Company not found' });
    res.json({ ...c.toObject(), id: c._id });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
};

// ── CREATE ────────────────────────────────────────────────────────────────────
export const createCompany = async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.status !== undefined) data.status = data.status === 'true' || data.status === true;

    const { logoFile, sealFile } = getFiles(req);
    const logoUrl = await uploadFile(logoFile, 'companies/logos');
    const sealUrl = await uploadFile(sealFile, 'companies/seals');
    if (logoUrl) data.logoUrl = logoUrl;
    if (sealUrl) data.sealUrl = sealUrl;

    if (isUsingMockData.value) {
      const c = { ...data, _id: `c${Date.now()}`, id: `c${Date.now()}`, createdAt: new Date() };
      mockStorage.companies.push(c);
      return res.status(201).json(c);
    }
    const company = new Company(data);
    await company.save();
    res.status(201).json({ ...company.toObject(), id: company._id });
  } catch (err: any) {
    console.error('Error creating company:', err);
    res.status(400).json({ error: err.message });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
export const updateCompany = async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    delete data._id; delete data.id;
    if (data.status !== undefined) data.status = data.status === 'true' || data.status === true;

    const { logoFile, sealFile } = getFiles(req);
    const logoUrl = await uploadFile(logoFile, 'companies/logos');
    const sealUrl = await uploadFile(sealFile, 'companies/seals');
    if (logoUrl) data.logoUrl = logoUrl;
    if (sealUrl) data.sealUrl = sealUrl;

    if (isUsingMockData.value) {
      const idx = mockStorage.companies.findIndex((c: any) => c.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      mockStorage.companies[idx] = { ...mockStorage.companies[idx], ...data };
      return res.json(mockStorage.companies[idx]);
    }
    const company = await Company.findByIdAndUpdate(
      req.params.id, { $set: data }, { new: true, runValidators: true }
    );
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ ...company.toObject(), id: company._id });
  } catch (err: any) {
    console.error('Error updating company:', err);
    res.status(400).json({ error: err.message });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    if (isUsingMockData.value) {
      const idx = mockStorage.companies.findIndex((c: any) => c.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      mockStorage.companies.splice(idx, 1);
      return res.json({ message: 'Deleted' });
    }
    await Company.findByIdAndDelete(req.params.id);
    res.json({ message: 'Company deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting company:', err);
    res.status(400).json({ error: err.message });
  }
};
