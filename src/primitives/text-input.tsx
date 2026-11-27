import React, { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { useProfiledTrayEffect, useProfiledTrayLayoutEffect } from "../telemetry/tray-layout-effect-profiler";
import { TextInput, TextInputProps } from "react-native";
import {
  useTrayHostActions,
  useTrayScope,
} from "../runtime/tray-context";
import {
  markTrayStepKeyboardFocus,
  markTrayStepKeyboardFocusRequested,
} from "../telemetry/tray-step-timing";

// the ref a TrayTextInput forwards, the underlying TextInput
export type TrayTextInputRef = React.ComponentRef<typeof TextInput>;

// named so published types skip React Native's internal TextInput instance type
type TrayTextInputComponent = React.ForwardRefExoticComponent<
  TextInputProps & React.RefAttributes<TrayTextInputRef>
>;

// a TextInput whose focus takes part in the tray keyboard policy
export const TrayTextInput: TrayTextInputComponent = forwardRef<
  TrayTextInputRef,
  TextInputProps
>(
  ({ autoFocus = false, ...props }, forwardedRef) => {
    const ref = useRef<TrayTextInputRef>(null);
    const trayId = useTrayScope();
    const { anticipateKeyboard, registerFocusable } = useTrayHostActions();

    // forward the native input ref and keep tray focus registration local
    useImperativeHandle(forwardedRef, () => ref.current as TrayTextInputRef);

    useProfiledTrayEffect("primitives/text-input#1", () => {
      if (!trayId) {
        return;
      }

      // registration lets tray close logic blur the active field before dismissal
      return registerFocusable(trayId, ref);
    }, [registerFocusable, trayId]);

    useProfiledTrayLayoutEffect("TrayTextInput.focusOnLayout", () => {
      if (!autoFocus) {
        return;
      }

      anticipateKeyboard();
      markTrayStepKeyboardFocusRequested(trayId);
      // manual autofocus lets keyboard anticipation run before focus
      ref.current?.focus();
    }, [anticipateKeyboard, autoFocus, trayId]);

    const handleFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>(
      (event) => {
        // manual focus follows the same pre-keyboard path as autofocus
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
