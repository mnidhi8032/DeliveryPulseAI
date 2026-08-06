/**
 * Hook that loads engagement model dropdown options from the API.
 * Falls back to the hardcoded arrays while loading or on error so the
 * UI never shows empty dropdowns.
 */
import { useEffect, useState } from "react";
import { listEngagementItems } from "../services/engagementModelService";
import {
  PROJECT_TYPES,
  DELIVERY_MODELS,
  PROJECT_CATEGORIES,
  WORK_SIZE_UNITS,
  METRIC_CATEGORIES,
} from "../types/qpm";

interface EngagementOptions {
  projectTypes: string[];
  deliveryModels: string[];
  projectCategories: string[];
  workSizeUnits: string[];
  dimensions: string[];
  loading: boolean;
}

export function useEngagementModelOptions(): EngagementOptions {
  const [projectTypes, setProjectTypes] = useState<string[]>(PROJECT_TYPES);
  const [deliveryModels, setDeliveryModels] = useState<string[]>(DELIVERY_MODELS);
  const [projectCategories, setProjectCategories] = useState<string[]>(PROJECT_CATEGORIES);
  const [workSizeUnits, setWorkSizeUnits] = useState<string[]>(WORK_SIZE_UNITS);
  const [dimensions, setDimensions] = useState<string[]>(METRIC_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listEngagementItems("PROJECT_TYPE"),
      listEngagementItems("DELIVERY_MODEL"),
      listEngagementItems("PROJECT_CATEGORY"),
      listEngagementItems("WORK_SIZE_UNIT"),
      listEngagementItems("DIMENSION"),
    ])
      .then(([pt, dm, pc, wu, dim]) => {
        if (cancelled) return;
        if (pt.length)  setProjectTypes(pt.map(i => i.value));
        if (dm.length)  setDeliveryModels(dm.map(i => i.value));
        if (pc.length)  setProjectCategories(pc.map(i => i.value));
        if (wu.length)  setWorkSizeUnits(wu.map(i => i.value));
        if (dim.length) setDimensions(dim.map(i => i.value));
      })
      .catch(() => { /* silently fall back to hardcoded defaults */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { projectTypes, deliveryModels, projectCategories, workSizeUnits, dimensions, loading };
}
