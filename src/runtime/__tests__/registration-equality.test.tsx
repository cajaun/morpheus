// authored registration changes follow value and reference rules
import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { areTrayRegistrationsEquivalent } from "../registration-equality";
import { createTrayRuntimeStore } from "../store/create-tray-runtime-store";
import type { TrayRegistration } from "../types";

// stable test nodes for registration comparisons
const Content = ({ label }: { label: string }) => label;
// a header whose props change between registrations
const Header = ({ title }: { title: string }) => title;
// a footer node for registration shape comparisons
const Footer = () => null;

// an authored registration with optional header content
const registration = (title = "Content One"): TrayRegistration => ({
  steps: [
    {
      key: "content-one",
      content: <Content label="Body" />,
      header: <Header title={title} />,
      options: { className: "bg-white", style: { paddingHorizontal: 24 } },
    },
  ],
  footer: <Footer />,
});

describe("tray registration equality", () => {
  it("treats a change in host preparation as a registration update", () => {
    expect(
      areTrayRegistrationsEquivalent(
        { ...registration(), deferHostPreparation: true },
        registration(),
      ),
    ).toBe(false);
  });

  it("treats freshly-authored equivalent arrays and JSX as one definition", () => {
    expect(
      areTrayRegistrationsEquivalent(registration(), registration()),
    ).toBe(true);
  });

  it("detects authored element prop changes", () => {
    expect(
      areTrayRegistrationsEquivalent(
        registration("Content One"),
        registration("Updated title"),
      ),
    ).toBe(false);
  });

  it("does not republish the runtime store for equivalent inline definitions", () => {
    const store = createTrayRuntimeStore({
      anticipateKeyboard: jest.fn(),
      prepareKeyboardHandoff: jest.fn(),
      dismissFocusedInputs: () => undefined,
      registerFocusable: () => () => undefined,
    });
    const listener = jest.fn();
    store.subscribe(listener);

    store.actions.registerTray("aave", registration());
    const registeredState = store.getState();
    listener.mockClear();

    store.actions.registerTray("aave", registration());

    expect(store.getState()).toBe(registeredState);
    expect(listener).not.toHaveBeenCalled();
  });
});
