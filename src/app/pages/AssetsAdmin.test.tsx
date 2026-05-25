/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssetDevice } from "../../domain/models/assets";
import { AppServices } from "../../domain/services/appServices";
import { PassthroughFleetLiveStateService } from "../../domain/services/liveFleetStateService";
import { AppServicesProvider } from "../providers/AppServicesProvider";
import { TEST_ASSET_DEVICES } from "../test-utils/assetBuilders";
import { AssetsAdmin } from "./AssetsAdmin";

function createAssetWithNoisyDecimals(): AssetDevice {
  const asset = TEST_ASSET_DEVICES[0];
  const teltonika = asset.teltonika;

  if (!teltonika) {
    throw new Error("Expected test asset to include Teltonika attributes.");
  }

  return {
    ...asset,
    signalStrengthPercent: 3.9450000000000003,
    batteryPercent: 82.12500000000001,
    teltonika: {
      ...teltonika,
      attributes: {
        ...teltonika.attributes,
        externalVoltage: {
          ...teltonika.attributes.externalVoltage,
          value: 3.9450000000000003,
        },
      },
    },
  };
}

function renderAssetsAdmin(assets: AssetDevice[] = TEST_ASSET_DEVICES) {
  const assetsRepository = {
    listAssets: vi.fn().mockResolvedValue(assets),
  };
  const services = {
    dataMode: "mock",
    assetsRepository,
    alertsRepository: {} as never,
    fleetRepository: {} as never,
    playbackRepository: {} as never,
    reportsRepository: {} as never,
    preferencesRepository: {} as never,
    liveFleetStateService: new PassthroughFleetLiveStateService(),
  } as AppServices;

  render(
    <AppServicesProvider services={services}>
      <AssetsAdmin />
    </AppServicesProvider>,
  );

  return assetsRepository;
}

describe("AssetsAdmin", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps Fleets assets focused on telemetry without provisioning or configuration controls", async () => {
    renderAssetsAdmin();

    await waitFor(() => {
      expect(screen.getAllByText("Atlas Prime").length).toBeGreaterThan(0);
    });

    expect(screen.queryByRole("button", { name: /provision device/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Atlas Prime")[0]);

    expect(screen.queryByRole("button", { name: /reboot/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /configure/i })).not.toBeInTheDocument();
    expect(screen.getByText("GNSS HDOP")).toBeInTheDocument();
    expect(screen.getByText("Engine RPM")).toBeInTheDocument();
    expect(screen.getByText("External Voltage")).toBeInTheDocument();
    expect(screen.getByText("Total Odometer")).toBeInTheDocument();
    expect(screen.getByText("Protocol")).toBeInTheDocument();
    expect(screen.getByText("CODEC_8")).toBeInTheDocument();
  });

  it("limits decimal noise in visible asset card values", async () => {
    renderAssetsAdmin([createAssetWithNoisyDecimals()]);

    await waitFor(() => {
      expect(screen.getAllByText("Atlas Prime").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText("Atlas Prime")[0]);

    expect(screen.getAllByText("3.95%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("82.13%").length).toBeGreaterThan(0);
    expect(screen.getByText("3.95 V")).toBeInTheDocument();
    expect(screen.queryByText(/3\.9450000000000003/)).not.toBeInTheDocument();
    expect(screen.queryByText(/82\.12500000000001/)).not.toBeInTheDocument();
  });
});
