import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { TextInput, TextInputProps } from "react-native";
import {
  useTrayMeasurementMode,
  useTrayHostActions,
  useTrayScope,
} from "../runtime/tray-context";

// wrap textinput so focus behavior participates in tray keyboard policy
export const TrayTextInput = forwardRef<TextInput, TextInputProps>(
  ({ autoFocus = false, ...props }, forwardedRef) => {
    const ref = useRef<TextInput>(null);
    const trayId = useTrayScope();
    const isMeasuring = useTrayMeasurementMode();
    const { anticipateKeyboard, registerFocusable } = useTrayHostActions();

    useImperativeHandle(forwardedRef, () => ref.current as TextInput);

    useEffect(() => {
      if (!trayId || isMeasuring) {
        return;
      }

      // registration lets tray level close logic blur the active field before dismissal
      return registerFocusable(trayId, ref);
    }, [isMeasuring, registerFocusable, trayId]);

    useLayoutEffect(() => {
      if (!autoFocus || isMeasuring) {
        return;
      }

      anticipateKeyboard();
      ref.current?.focus();
    }, [anticipateKeyboard, autoFocus, isMeasuring]);

    const handleFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>(
      (event) => {
        if (!isMeasuring) {
          // manual focus should follow the same pre keyboard path as autofocus
          anticipateKeyboard();
        }
        props.onFocus?.(event);
      },
      [anticipateKeyboard, isMeasuring, props],
    );

    return (
      <TextInput
        ref={ref}
        autoFocus={false}
        {...props}
        onFocus={handleFocus}
      />
    );
  },
);

TrayTextInput.displayName = "TrayTextInput";
