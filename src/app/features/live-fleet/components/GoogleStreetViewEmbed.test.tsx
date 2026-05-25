/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleStreetViewEmbed } from "./GoogleStreetViewEmbed";

describe("GoogleStreetViewEmbed", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows a non-sensitive fallback when the Maps Embed API key is missing", () => {
    render(
      <GoogleStreetViewEmbed
        vehicleName="Atlas 12"
        apiKey=""
        latitude={51.4416}
        longitude={5.4697}
        heading={92}
        gpsAccuracyMeters={8}
      />,
    );

    expect(screen.getByText(/Street View is not configured/i)).toBeInTheDocument();
    expect(screen.getByText(/VITE_GOOGLE_MAPS_EMBED_API_KEY/i)).toBeInTheDocument();
    expect(screen.queryByTitle(/Atlas 12 street view/i)).not.toBeInTheDocument();
  });

  it("shows a fallback for inaccurate or invalid vehicle coordinates", () => {
    render(
      <GoogleStreetViewEmbed
        vehicleName="Atlas 12"
        apiKey="maps-test-key"
        latitude={51.4416}
        longitude={5.4697}
        heading={92}
        gpsAccuracyMeters={140}
      />,
    );

    expect(screen.getByText(/current GPS point is not precise enough/i)).toBeInTheDocument();
    expect(screen.queryByTitle(/Atlas 12 street view/i)).not.toBeInTheDocument();
  });

  it("renders a Street View iframe without echoing the key in fallback copy", () => {
    render(
      <GoogleStreetViewEmbed
        vehicleName="Atlas 12"
        apiKey="maps-test-key"
        latitude={51.4416}
        longitude={5.4697}
        heading={92}
        gpsAccuracyMeters={8}
      />,
    );

    const iframe = screen.getByTitle("Atlas 12 street view");

    expect(iframe).toHaveAttribute("src", expect.stringContaining("https://www.google.com/maps/embed/v1/streetview"));
    expect(iframe).toHaveAttribute("src", expect.stringContaining("key=maps-test-key"));
    expect(screen.queryByText(/maps-test-key/)).not.toBeInTheDocument();
  });

  it("shows a runtime fallback when the iframe reports a load error", async () => {
    render(
      <GoogleStreetViewEmbed
        vehicleName="Atlas 12"
        apiKey="maps-test-key"
        latitude={51.4416}
        longitude={5.4697}
        heading={92}
        gpsAccuracyMeters={8}
        loadTimeoutMs={100}
      />,
    );

    fireEvent.error(screen.getByTitle("Atlas 12 street view"));

    await waitFor(() => expect(screen.getByText(/Street View could not be loaded/i)).toBeInTheDocument());
    expect(screen.getByText(/Maps Embed API/i)).toBeInTheDocument();
    expect(screen.queryByText(/maps-test-key/)).not.toBeInTheDocument();
  });

  it("shows a runtime fallback when the iframe load times out", () => {
    vi.useFakeTimers();

    render(
      <GoogleStreetViewEmbed
        vehicleName="Atlas 12"
        apiKey="maps-test-key"
        latitude={51.4416}
        longitude={5.4697}
        heading={92}
        gpsAccuracyMeters={8}
        loadTimeoutMs={100}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(101);
    });

    expect(screen.getByText(/Street View could not be loaded/i)).toBeInTheDocument();
  });

  it("keeps the iframe mounted when a drag leaves Street View and ends outside it", async () => {
    render(
      <GoogleStreetViewEmbed
        vehicleName="Atlas 12"
        apiKey="maps-test-key"
        latitude={51.4416}
        longitude={5.4697}
        heading={92}
        gpsAccuracyMeters={8}
      />,
    );

    const frame = screen.getByTestId("street-view-frame");
    const originalIframe = screen.getByTitle("Atlas 12 street view");

    fireEvent.mouseLeave(frame, { buttons: 1 });
    fireEvent.mouseUp(window);

    await waitFor(() => expect(screen.getByTitle("Atlas 12 street view")).toBe(originalIframe));
  });
});
