import React from "react";
import { Text } from "react-native";
import { TrayBody } from "../../primitives/body";
import { TrayHeader } from "../../primitives/header";
import { TrayStep } from "../tray-step";
import { compileTraySteps } from "../tray-step-compiler";

describe("compileTraySteps", () => {
  it("compiles ordered steps and resolves root defaults before step overrides", () => {
    const steps = compileTraySteps(
      <>
        <TrayStep key="profile" options={{ fullScreen: true }}>
          <TrayHeader withSeparator>
            <Text>Profile</Text>
          </TrayHeader>
          <TrayBody>
            <Text>Choose a profile</Text>
          </TrayBody>
        </TrayStep>
        <TrayStep>
          <TrayBody>
            <Text>Confirm</Text>
          </TrayBody>
        </TrayStep>
      </>,
      { className: "bg-white", fullScreen: false },
    );

    expect(steps).toHaveLength(2);
    expect(steps[0].key).toBe("profile");
    expect(steps[0].header).toEqual(
      expect.objectContaining({ type: TrayHeader }),
    );
    expect(steps[0].options).toEqual({
      className: "bg-white",
      fullScreen: true,
    });
    expect(steps[1].key).toBe("morpheus-step-1");
    expect(steps[1].header).toBeUndefined();
  });

  it("preserves custom header and content abstractions by their authored slots", () => {
    const CustomHeader = () => <TrayHeader>Custom header</TrayHeader>;
    const CustomContent = () => <TrayBody>Custom content</TrayBody>;

    const steps = compileTraySteps(
      <TrayStep key="custom">
        <CustomHeader />
        <CustomContent />
      </TrayStep>,
    );

    expect(steps[0].header).toEqual(
      expect.objectContaining({ type: CustomHeader }),
    );
    expect(steps[0].content).toEqual(
      expect.objectContaining({ type: CustomContent }),
    );
  });

  it("rejects missing steps and ambiguous step children", () => {
    expect(() => compileTraySteps(null)).toThrow(
      "Tray.Root requires at least one Tray.Step",
    );

    expect(() =>
      compileTraySteps(
        <TrayStep>
          <TrayHeader>Header</TrayHeader>
          <TrayBody>Body</TrayBody>
          <TrayBody>Another body</TrayBody>
        </TrayStep>,
      ),
    ).toThrow(
      "Tray.Step accepts an optional header followed by exactly one content root",
    );
  });
});
