import React from "react";
import { describe, expect, it } from "@jest/globals";
import { Text } from "react-native";
import { TrayBody } from "../../primitives/body";
import { TrayFooter } from "../../primitives/footer";
import { TrayHeader } from "../../primitives/header";
import { TrayStep } from "../tray-step";
import { compileTraySteps } from "../tray-step-compiler";
import type { TrayRegistration } from "../tray-context";
import {
  arePresentedTraysEquivalent,
  createPresentedTray,
} from "../presenter/model";

const present = (registration: TrayRegistration, index: number) =>
  createPresentedTray({
    entry: { trayId: "flow", index },
    registration,
    stackIndex: 0,
    stackLength: 1,
  })!;

describe("per-step footers", () => {
  it("compiles a Tray.Footer inside a step as the step's footer", () => {
    const steps = compileTraySteps(
      <>
        <TrayStep key="one">
          <TrayHeader>
            <Text>One</Text>
          </TrayHeader>
          <TrayBody>
            <Text>Body</Text>
          </TrayBody>
          <TrayFooter id="continue">
            <Text>Continue</Text>
          </TrayFooter>
        </TrayStep>
        <TrayStep key="two">
          <TrayBody>
            <Text>Body</Text>
          </TrayBody>
        </TrayStep>
      </>,
    );

    expect(steps[0].header).toBeTruthy();
    expect(React.isValidElement(steps[0].content)).toBe(true);
    expect((steps[0].content as React.ReactElement).type).toBe(TrayBody);
    expect((steps[0].footer as React.ReactElement).type).toBe(TrayFooter);
    expect(steps[0].footerId).toBe("continue");
    expect(steps[1].footer).toBeUndefined();
  });

  it("rejects more than one footer in a step", () => {
    expect(() =>
      compileTraySteps(
        <TrayStep>
          <TrayBody>
            <Text>Body</Text>
          </TrayBody>
          <TrayFooter>
            <Text>A</Text>
          </TrayFooter>
          <TrayFooter>
            <Text>B</Text>
          </TrayFooter>
        </TrayStep>,
      ),
    ).toThrow("at most one Tray.Footer");
  });

  const sharedFooter = <TrayFooter id="continue"><Text>Go</Text></TrayFooter>;
  const registration: TrayRegistration = {
    steps: [
      { key: "a", content: <Text>a</Text>, footer: sharedFooter, footerId: "continue" },
      { key: "b", content: <Text>b</Text>, footer: sharedFooter, footerId: "continue" },
      { key: "c", content: <Text>c</Text>, footer: <TrayFooter><Text>Own</Text></TrayFooter> },
      { key: "d", content: <Text>d</Text> },
    ],
  };

  it("keys shared footers by id, own footers by step, and none when absent", () => {
    const a = present(registration, 0);
    const b = present(registration, 1);
    const c = present(registration, 2);
    const d = present(registration, 3);

    expect(a.stepFooterKey).toBe("id:continue");
    expect(b.stepFooterKey).toBe("id:continue");
    expect(c.stepFooterKey).toBe("step:c");
    expect(d.stepFooterKey).toBeNull();
    expect(d.stepFooter).toBeNull();
    // the legacy fixed footer layer is not used by step-footer trays
    expect(a.footer).toBeNull();
    // sections drop their bottom padding only on steps that have a footer
    expect(a.stepOptions.hasFooter).toBe(true);
    expect(d.stepOptions.hasFooter).toBe(false);
  });

  it("uses the root footer as the default for steps without their own", () => {
    const rootFooter = <TrayFooter><Text>Root</Text></TrayFooter>;
    const withRoot: TrayRegistration = { ...registration, footer: rootFooter };
    const d = present(withRoot, 3);

    expect(d.stepFooter).toBe(rootFooter);
    expect(d.stepFooterKey).toBe("root");
    expect(d.stepOptions.hasFooter).toBe(true);
  });

  it("renders a root-only footer through the step footer layers", () => {
    const rootFooter = <TrayFooter><Text>Root</Text></TrayFooter>;
    const rootOnly: TrayRegistration = {
      steps: [
        { key: "a", content: <Text>a</Text> },
        { key: "b", content: <Text>b</Text> },
      ],
      footer: rootFooter,
    };
    const a = present(rootOnly, 0);
    const b = present(rootOnly, 1);

    expect(a.footer).toBeNull();
    expect(a.stepFooter).toBe(rootFooter);
    // one key across the steps: the footer stays on screen
    expect(a.stepFooterKey).toBe("root");
    expect(b.stepFooterKey).toBe("root");
  });

  it("keeps a trigger-morph footer on the fixed footer layer", () => {
    const rootFooter = <TrayFooter><Text>Root</Text></TrayFooter>;
    const morph: TrayRegistration = {
      steps: [{ key: "a", content: <Text>a</Text> }],
      footer: rootFooter,
      transition: { open: "expandFromTrigger", close: "collapseToTrigger" },
    };
    const a = present(morph, 0);

    expect(a.footer).toBe(rootFooter);
    expect(a.stepFooterKey).toBeUndefined();
  });

  it("leaves trays without footers off the footer layers", () => {
    const none: TrayRegistration = {
      steps: [{ key: "a", content: <Text>a</Text> }],
    };

    expect(present(none, 0).stepFooterKey).toBeUndefined();
  });

  it("treats a footer key change as a payload change", () => {
    const b = present(registration, 1);
    const c = present(registration, 2);

    expect(
      arePresentedTraysEquivalent(b, { ...b, stepFooterKey: c.stepFooterKey }),
    ).toBe(false);
    expect(arePresentedTraysEquivalent(b, { ...b })).toBe(true);
  });
});
