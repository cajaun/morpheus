import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import type { SharedValue } from "react-native-reanimated";
import { areTrayRegistrationsEquivalent } from "../registration-equality";
import { createTrayRuntimeStore } from "../store/create-tray-runtime-store";
import type { TrayRegistration } from "../types";

const Content = ({ label }: { label: string }) => label;
const Header = ({ title }: { title: string }) => title;
const Footer = () => null;

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
      keyboardHeight: { value: 0 } as SharedValue<number>,
      anticipateKeyboard: jest.fn(),
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
