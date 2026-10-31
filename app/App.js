import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// 서버(GitHub Actions)가 매일 갱신하는 JSON 주소. app.json → expo.extra.dataUrl 에서 설정
const DATA_URL = Constants.expoConfig?.extra?.dataUrl;

// 앱이 켜져 있을 때도 알림 배너를 보여줌
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPush() {
  if (!Device.isDevice) throw new Error('푸시 알림은 실제 iPhone에서만 받을 수 있어요.');
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') throw new Error('알림 권한이 꺼져 있어요. 설정 > 알림에서 허용해 주세요.');

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

const COLORS = { up: '#E5383B', down: '#1E6FD9', flat: '#6B7280' }; // 한국식: 상승 빨강, 하락 파랑

function colorOf(q) {
  // 금리·환율도 수치가 오르면 빨강
  const v = q.kind === 'index' || q.kind === 'commodity' ? q.changePct : q.change;
  if (Math.abs(q.changePct) < 0.005) return COLORS.flat;
  return v > 0 ? COLORS.up : COLORS.down;
}

function MarketCard({ report }) {
  if (!report) return null;
  const updated = new Date(report.updatedAt).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{report.title}</Text>
        <Text style={styles.muted}>{updated} 업데이트</Text>
      </View>

      {report.quotes.map((q) => (
        <View key={q.symbol} style={styles.row}>
          <Text style={styles.qName}>{q.name}</Text>
          <Text style={[styles.qValue, { color: colorOf(q) }]}>
            {q.text.replace(`${q.name} `, '')}
          </Text>
        </View>
      ))}

      {report.summary && (
        <View style={styles.summary}>
          <Text style={styles.summaryHead}>🧠 {report.summary.headline}</Text>
          <Text style={styles.summaryBody}>{report.summary.body}</Text>
          <Text style={styles.disclaimer}>AI 요약 · 투자 권유가 아닙니다</Text>
        </View>
      )}
    </View>
  );
}

function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [pushError, setPushError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!DATA_URL) throw new Error('app.json의 extra.dataUrl을 설정해 주세요.');
      // 캐시 우회용 쿼리 추가
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`데이터를 불러오지 못했어요 (HTTP ${res.status})`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    registerForPush().then(setToken).catch((e) => setPushError(e.message));
    // 알림을 탭해서 들어오면 최신 데이터로 새로고침
    const sub = Notifications.addNotificationResponseReceivedListener(() => load());
    return () => sub.remove();
  }, [load]);

  // 최근 업데이트된 시장을 위에 표시
  const reports = ['kr', 'us']
    .map((k) => data?.[k])
    .filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={load} />}
      >
        <Text style={styles.h1}>오늘의 증시</Text>
        <Text style={styles.muted}>매일 16:05 한국 · 06:15 미국 마감 알림</Text>

        {loading && !data && <ActivityIndicator style={{ marginTop: 40 }} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {reports.map((r) => (
          <MarketCard key={r.title} report={r} />
        ))}

        <View style={[styles.card, styles.tokenCard]}>
          <Text style={styles.cardTitle}>🔔 알림 설정</Text>
          {token ? (
            <>
              <Text style={styles.muted}>
                아래 토큰을 GitHub 저장소의 Secret(EXPO_PUSH_TOKENS)에 등록하면 알림이 와요.
              </Text>
              <Text selectable style={styles.token}>{token}</Text>
              <Pressable style={styles.button} onPress={() => Share.share({ message: token })}>
                <Text style={styles.buttonText}>토큰 공유/복사</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.muted}>{pushError ?? '알림 토큰을 받는 중…'}</Text>
          )}
        </View>
      </ScrollView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Home />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  h1: { fontSize: 28, fontWeight: '800', color: '#111827' },
  muted: { fontSize: 13, color: '#6B7280' },
  error: { color: COLORS.up, marginTop: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  qName: { fontSize: 15, color: '#374151' },
  qValue: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  summary: { marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: '#F9FAFB', gap: 6 },
  summaryHead: { fontSize: 15, fontWeight: '700', color: '#111827' },
  summaryBody: { fontSize: 14, lineHeight: 21, color: '#374151' },
  disclaimer: { fontSize: 11, color: '#9CA3AF' },
  tokenCard: { marginTop: 8 },
  token: { fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), color: '#111827' },
  button: { backgroundColor: '#111827', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
