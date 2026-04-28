import fs from "fs";
import path from "path";
import { SimulationResult } from "./types";

const RESULTS_DIR = path.join(process.cwd(), "public", "results");

export function loadAllResults(): SimulationResult[] {
  if (!fs.existsSync(RESULTS_DIR)) return [];

  return fs
    .readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((filename) => {
      const raw = fs.readFileSync(path.join(RESULTS_DIR, filename), "utf-8");
      const data = JSON.parse(raw) as SimulationResult;
      data._filename = filename;
      return data;
    });
}
