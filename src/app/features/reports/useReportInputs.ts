import { useCallback, useMemo } from "react";
import type { Vehicle } from "../../../domain/models/vehicle";
import type { FleetRepository } from "../../../domain/repositories/fleetRepository";
import type { ReportsRepository } from "../../../domain/repositories/reportsRepository";
import { useRepositoryQuery } from "../../hooks/useRepositoryQuery";
import {
  type ReportBuilderDraft,
  createInitialReportBuilderDraft,
} from "./reportBuilderViewModel";
import type { ReportDefinition, ReportParameterDefinition } from "../../../domain/models/reports";

interface UseReportInputsOptions {
  fleetRepository: FleetRepository;
  reportsRepository: ReportsRepository;
}

interface ReportInputsData {
  definitions: ReportDefinition[];
  parameters: ReportParameterDefinition[];
  vehicles: Vehicle[];
}

const emptyReportInputs: ReportInputsData = {
  definitions: [],
  parameters: [],
  vehicles: [],
};

export function useReportInputs({ fleetRepository, reportsRepository }: UseReportInputsOptions) {
  const query = useCallback(async (): Promise<ReportInputsData> => {
    const [definitions, parameters, vehicles] = await Promise.all([
      reportsRepository.listReportDefinitions(),
      reportsRepository.listReportParameters(),
      fleetRepository.listVehicles(),
    ]);

    return { definitions, parameters, vehicles };
  }, [fleetRepository, reportsRepository]);

  const inputsQuery = useRepositoryQuery({
    initialData: emptyReportInputs,
    query,
  });

  const draft = useMemo<ReportBuilderDraft | null>(() => {
    if (!inputsQuery.data.definitions.length) {
      return null;
    }

    return createInitialReportBuilderDraft(inputsQuery.data.definitions);
  }, [inputsQuery.data.definitions]);

  return {
    ...inputsQuery,
    definitions: inputsQuery.data.definitions,
    draft,
    parameters: inputsQuery.data.parameters,
    vehicles: inputsQuery.data.vehicles,
  };
}
