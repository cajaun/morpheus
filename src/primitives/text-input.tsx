import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { useProfiledTrayLayoutEffect } from "../telemetry/tray-layout-effect-profiler";
import { TextInput, TextInputProps } from "react-native";
import {
  useTrayHostActions,
  useTrayScope,
} from "../runtime/tray-context";
import {
  markTrayStepKeyboardFocus,
  markTrayStepKeyboardFocusRequested,
} from "../telemetry/tray-step-timing";

// The ref a TrayTextInput forwards: the underlying React Native TextInput.
export type TrayTextInputRef = React.ComponentRef<typeof TextInput>;

// Named explicitly so published type definitions do not depend on React
// Native's internal TextInput instance type.
type TrayTextInputComponent = React.ForwardRefExoticComponent<
  TextInputProps & React.RefAttributes<TrayTextInputRef>
>;

// wrap textinput so focus behavior participates in tray keyboard policy
export const TrayTextInput: TrayTextInputComponent = forwardRef<
  TrayTextInputRef,
  TextInputProps
>(
  ({ autoFocus = false, ...props }, forwardedRef) => {
    const ref = useRef<TrayTextInputRef>(null);
    const trayId = useTrayScope();
    const { anticipateKeyboard, registerFocusable } = useTrayHostActions();

    // forward the native input ref while keeping tray focus registration local
    useImperativeHandle(forwardedRef, () => ref.current as TrayTextInputRef);

    useEffect(() => {
      if (!trayId) {
        return;
      }

      // registration lets tray level close logic blur the active field before dismissal
      return registerFocusable(trayId, ref);
    }, [registerFocusable, trayId]);

    useProfiledTrayLayoutEffect("TrayTextInput.focusOnLayout", () => {
      if (!autoFocus) {
        return;
      }

      anticipateKeyboard();
      markTrayStepKeyboardFocusRequested(trayId);
      // autofocus is manual so keyboard anticipation can run before focus
      ref.current?.focus();
    }, [anticipateKeyboard, autoFocus, trayId]);

    const handleFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>(
      (event) => {
        // manual focus should follow the same pre keyboard path as autofocus
        anticipateKeyboard();
        markTrayStepKeyboardFocus(trayId);
        props.onFocus?.(event);
      },
      [anticipateKeyboard, props, trayId],
    );

    return (
      <TextInput
        ref={ref}
        // native autofocus would bypass tray keyboard anticipation
        autoFocus={false}
        {...props}
        onFocus={handleFocus}
      />
    );
  },
);

TrayTextInput.displayName = "TrayTextInput";
