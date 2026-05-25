import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { GeneratedReportPreview, ReportCategory } from "../../../domain/models/reports";
import { createCalendarMonth } from "../../components/shared/datePicker/datePickerModel";
import { useAppServices } from "../../providers/AppServicesProvider";
import {
  createDefaultVehicleGroups,
  deriveVehicleReportCapabilities,
  resolveReportVehicleSelection,
  summarizeReportCompatibility,
} from "./reportCapabilities";
import {
  type ReportBuilderDraft,
  applyReportDefinitionToDraft,
  buildReportGenerationRequest,
} from "./reportBuilderViewModel";
import { createReportExportFiles, downloadReportExportFile } from "./reportExportService";
import {
  createDraftRequestKey,
  createPreviewKey,
  formatReportCategory,
  getAvailableReportOutputModes,
  getReportDeliveryActionMessage,
  getVehicleSelection,
  supportedExportFormats,
} from "./reportPageModel";
import { validateReportBuilderDraft } from "./reportValidation";
import { useReportInputs } from "./useReportInputs";

export type ReportCategoryFilter = "all" | ReportCategory;
export type ReportDatePickerTarget = "start" | "end";

export function useReportBuilderController() {
  const { dataMode, fleetRepository, reportsRepository } = useAppServices();
  const inputs = useReportInputs({ fleetRepository, reportsRepository });
  const [draft, setDraft] = useState<ReportBuilderDraft | null>(null);
  const [preview, setPreview] = useState<GeneratedReportPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ReportCategoryFilter>("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingPrintPreviewKey, setPendingPrintPreviewKey] = useState<string | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState<ReportDatePickerTarget | null>(null);
  const latestRequestKeyRef = useRef<string | null>(null);
  const previewGenerationRef = useRef(0);
  const customStartDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const customEndDateButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeDatePicker = useCallback(() => setOpenDatePicker(null), []);

  useEffect(() => {
    setDraft((currentDraft) => currentDraft ?? inputs.draft);
  }, [inputs.draft]);

  useLayoutEffect(() => {
    latestRequestKeyRef.current = draft ? createDraftRequestKey(draft) : null;
  }, [draft]);

  useEffect(() => {
    if (!preview || !pendingPrintPreviewKey || createPreviewKey(preview) !== pendingPrintPreviewKey) return;

    const timeoutId = window.setTimeout(() => {
      window.print();
      setActionMessage("Print dialog opened for the report preview.");
      setPendingPrintPreviewKey(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pendingPrintPreviewKey, preview]);

  const selectedDefinition = useMemo(
    () => inputs.definitions.find((definition) => definition.id === draft?.definitionId) ?? inputs.definitions[0],
    [inputs.definitions, draft?.definitionId],
  );
  const availableOutputModes = useMemo(
    () => (selectedDefinition ? getAvailableReportOutputModes(selectedDefinition, dataMode) : []),
    [dataMode, selectedDefinition],
  );

  useEffect(() => {
    if (!draft || !selectedDefinition || availableOutputModes.includes(draft.outputMode)) {
      return;
    }

    setDraft({ ...draft, outputMode: availableOutputModes[0] ?? "preview" });
  }, [availableOutputModes, draft, selectedDefinition]);

  const vehicleGroups = useMemo(() => createDefaultVehicleGroups(inputs.vehicles), [inputs.vehicles]);
  const capabilityProfiles = useMemo(() => deriveVehicleReportCapabilities(inputs.vehicles), [inputs.vehicles]);
  const selectedVehicles = useMemo(
    () => (draft ? resolveReportVehicleSelection(getVehicleSelection(draft), inputs.vehicles, vehicleGroups) : []),
    [draft, inputs.vehicles, vehicleGroups],
  );
  const selectedCompatibility = useMemo(
    () =>
      selectedDefinition
        ? summarizeReportCompatibility(selectedDefinition, selectedVehicles, capabilityProfiles)
        : null,
    [capabilityProfiles, selectedDefinition, selectedVehicles],
  );
  const validation = useMemo(
    () =>
      draft && selectedDefinition
        ? validateReportBuilderDraft({
            draft,
            definition: selectedDefinition,
            parameters: inputs.parameters,
            selectedVehicles,
            capabilityProfiles,
          })
        : null,
    [capabilityProfiles, draft, inputs.parameters, selectedDefinition, selectedVehicles],
  );
  const categoryOptions = useMemo(
    () => [
      { id: "all" as const, label: "All Reports" },
      ...Array.from(new Set(inputs.definitions.map((definition) => definition.category))).map((category) => ({
        id: category,
        label: formatReportCategory(category),
      })),
    ],
    [inputs.definitions],
  );
  const filteredDefinitions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return inputs.definitions.filter((definition) => {
      const matchesCategory = categoryFilter === "all" || definition.category === categoryFilter;
      const matchesSearch =
        !normalizedSearch ||
        definition.name.toLowerCase().includes(normalizedSearch) ||
        definition.description.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, inputs.definitions, searchTerm]);
  const visibleParameters = useMemo(() => {
    if (!selectedDefinition) return inputs.parameters;
    const allowedIds = new Set(selectedDefinition.parameterIds);
    return inputs.parameters.filter((parameter) => allowedIds.has(parameter.id));
  }, [inputs.parameters, selectedDefinition]);
  const selectedParameterIds = useMemo(() => new Set(draft?.selectedParameterIds ?? []), [draft?.selectedParameterIds]);
  const supportedFormats = useMemo(() => supportedExportFormats(selectedDefinition), [selectedDefinition]);
  const selectedDefinitionCapabilities = useMemo(
    () =>
      selectedDefinition
        ? [
            ...(selectedDefinition.requiredCapabilities ?? []),
            ...(selectedDefinition.optionalCapabilities ?? []),
          ]
        : [],
    [selectedDefinition],
  );
  const activeCustomDateValue = openDatePicker === "start" ? draft?.customStartDateIso ?? "" : draft?.customEndDateIso ?? "";
  const customDatePickerMonth = useMemo(() => createCalendarMonth(activeCustomDateValue), [activeCustomDateValue]);

  const selectDefinition = useCallback(
    (definitionId: string) => {
      const definition = inputs.definitions.find((candidate) => candidate.id === definitionId);
      if (!draft || !definition) {
        return;
      }

      const nextDraft = applyReportDefinitionToDraft(draft, definition);
      const nextOutputModes = getAvailableReportOutputModes(definition, dataMode);
      setDraft(
        nextOutputModes.includes(nextDraft.outputMode)
          ? nextDraft
          : { ...nextDraft, outputMode: nextOutputModes[0] ?? "preview" },
      );
      setPreview(null);
      setActionMessage(null);
    },
    [dataMode, draft, inputs.definitions],
  );

  const selectCustomDate = useCallback(
    (nextDateValue: string) => {
      if (!draft || !openDatePicker) {
        return;
      }

      setDraft({
        ...draft,
        [openDatePicker === "start" ? "customStartDateIso" : "customEndDateIso"]: nextDateValue,
      });
      setOpenDatePicker(null);
    },
    [draft, openDatePicker],
  );

  const generatePreview = useCallback(
    async (options: { printAfterRender?: boolean } = {}): Promise<GeneratedReportPreview | null> => {
      if (!draft || !validation?.canGenerate) return null;
      const request = buildReportGenerationRequest(draft);
      const requestKey = JSON.stringify(request);
      const generationId = previewGenerationRef.current + 1;
      previewGenerationRef.current = generationId;
      latestRequestKeyRef.current = requestKey;
      setActionMessage(null);
      setIsPreviewLoading(true);
      try {
        const nextPreview = await reportsRepository.previewReport(request);
        if (generationId !== previewGenerationRef.current || requestKey !== latestRequestKeyRef.current) {
          return null;
        }
        setPreview(nextPreview);
        if (options.printAfterRender) {
          setPendingPrintPreviewKey(createPreviewKey(nextPreview));
        }
        return nextPreview;
      } finally {
        if (generationId === previewGenerationRef.current) {
          setIsPreviewLoading(false);
        }
      }
    },
    [draft, reportsRepository, validation?.canGenerate],
  );

  const handleRunReport = useCallback(async () => {
    if (!draft || !validation?.canGenerate) {
      setActionMessage("Fix validation issues before generating the report.");
      return;
    }

    const nextPreview = await generatePreview({ printAfterRender: draft.outputMode === "print" });
    if (!nextPreview) return;

    if (draft.outputMode === "print") {
      return;
    }

    if (draft.outputMode === "export") {
      const files = createReportExportFiles(nextPreview, {
        formats: draft.exportFormats,
        includeSummary: draft.includeSummary,
        includeCharts: draft.includeCharts,
        includeMap: draft.includeMap,
        includeRawData: draft.includeRawData,
        includeMetadata: true,
        groupBy: draft.grouping,
        unitSystem: draft.unitSystem,
        dateTimeFormat: draft.dateTimeFormat,
        pageOrientation: draft.pageOrientation,
        fileName: draft.fileName,
      });
      files.forEach(downloadReportExportFile);
      setActionMessage(`Exported ${files.length} ${files.length === 1 ? "file" : "files"}.`);
      return;
    }

    if (draft.outputMode === "email" || draft.outputMode === "schedule") {
      setActionMessage(getReportDeliveryActionMessage(draft.outputMode));
      return;
    }

    setActionMessage("Preview generated.");
  }, [draft, generatePreview, validation?.canGenerate]);

  return {
    actionMessage,
    activeCustomDateValue,
    availableOutputModes,
    capabilityProfiles,
    categoryFilter,
    categoryOptions,
    customDatePickerMonth,
    customEndDateButtonRef,
    customStartDateButtonRef,
    dataMode,
    definitions: inputs.definitions,
    draft,
    filteredDefinitions,
    handleRunReport,
    isLoadingInputs: inputs.isLoading,
    isPreviewLoading,
    openDatePicker,
    parameters: inputs.parameters,
    preview,
    searchTerm,
    selectCustomDate,
    selectDefinition,
    selectedCompatibility,
    selectedDefinition,
    selectedDefinitionCapabilities,
    selectedParameterIds,
    selectedVehicles,
    setCategoryFilter,
    setDraft,
    setOpenDatePicker,
    setSearchTerm,
    supportedFormats,
    validation,
    vehicleGroups,
    vehicles: inputs.vehicles,
    visibleParameters,
  };
}
