import { type PropsWithChildren, useId, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export type SpotlightCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  spotlightColor?: string;
  spotlightRadius?: number;
}>;

type ParsedColor = {
  color: string;
  opacity: number;
};

type PointerEventLike = NativeSyntheticEvent<{
  clientX?: number;
  clientY?: number;
  locationX?: number;
  locationY?: number;
}> & {
  currentTarget?: {
    getBoundingClientRect?: () => { left: number; top: number };
  };
};

function parseSpotlightColor(input: string): ParsedColor {
  const rgbaMatch =
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([0-9]*\.?[0-9]+)\s*\)$/i.exec(
      input.trim()
    );

  if (rgbaMatch) {
    const [, r, g, b, alpha] = rgbaMatch;
    const parsedAlpha = Number.parseFloat(alpha);
    return {
      color: `rgb(${r}, ${g}, ${b})`,
      opacity: Number.isFinite(parsedAlpha) ? Math.min(1, Math.max(0, parsedAlpha)) : 0.25,
    };
  }

  return { color: input, opacity: 1 };
}

export function SpotlightCard({
  children,
  style,
  contentStyle,
  spotlightColor = 'rgba(255, 255, 255, 0.25)',
  spotlightRadius = 260,
}: SpotlightCardProps) {
  const rawId = useId();
  const gradientId = `spotlight-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const spotlightOpacity = useSharedValue(0);

  const parsedColor = parseSpotlightColor(spotlightColor);

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: spotlightOpacity.value,
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
    setPosition((current) =>
      current.x === 0 && current.y === 0 ? { x: width / 2, y: height / 2 } : current
    );
  };

  const updateFromPointer = (event: PointerEventLike) => {
    const rect =
      Platform.OS === 'web' && typeof event.currentTarget?.getBoundingClientRect === 'function'
        ? event.currentTarget.getBoundingClientRect()
        : null;

    if (
      rect &&
      typeof event.nativeEvent.clientX === 'number' &&
      typeof event.nativeEvent.clientY === 'number'
    ) {
      setPosition({
        x: event.nativeEvent.clientX - rect.left,
        y: event.nativeEvent.clientY - rect.top,
      });
      return;
    }

    if (
      typeof event.nativeEvent.locationX === 'number' &&
      typeof event.nativeEvent.locationY === 'number'
    ) {
      setPosition({
        x: event.nativeEvent.locationX,
        y: event.nativeEvent.locationY,
      });
    }
  };

  const updateFromTouch = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    if (typeof locationX === 'number' && typeof locationY === 'number') {
      setPosition({ x: locationX, y: locationY });
    }
  };

  const showSpotlight = () => {
    spotlightOpacity.set(withTiming(1, { duration: 220 }));
  };

  const hideSpotlight = () => {
    spotlightOpacity.set(withTiming(0, { duration: 350 }));
  };

  return (
    <View
      onLayout={handleLayout}
      onPointerEnter={(event) => {
        updateFromPointer(event as unknown as PointerEventLike);
        showSpotlight();
      }}
      onPointerMove={(event) => {
        updateFromPointer(event as unknown as PointerEventLike);
      }}
      onPointerLeave={hideSpotlight}
      onTouchStart={(event) => {
        if (Platform.OS !== 'web') {
          updateFromTouch(event);
          showSpotlight();
        }
      }}
      onTouchMove={(event) => {
        if (Platform.OS !== 'web') {
          updateFromTouch(event);
        }
      }}
      onTouchEnd={() => {
        if (Platform.OS !== 'web') {
          hideSpotlight();
        }
      }}
      onTouchCancel={() => {
        if (Platform.OS !== 'web') {
          hideSpotlight();
        }
      }}
      style={[styles.card, style]}>
      {size.width > 0 && size.height > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.overlay, animatedOverlayStyle]}>
          <Svg width={size.width} height={size.height}>
            <Defs>
              <RadialGradient
                id={gradientId}
                cx={position.x}
                cy={position.y}
                r={spotlightRadius}
                gradientUnits="userSpaceOnUse">
                <Stop offset="0%" stopColor={parsedColor.color} stopOpacity={parsedColor.opacity} />
                <Stop offset="80%" stopColor={parsedColor.color} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${gradientId})`} />
          </Svg>
        </Animated.View>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#111111',
    padding: 24,
  },
  overlay: {
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 2,
  },
});
