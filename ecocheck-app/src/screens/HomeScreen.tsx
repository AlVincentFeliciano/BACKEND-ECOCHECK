// /ecocheck-app/src/screens/HomeScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Linking,
  Dimensions,
  FlatList,
  SafeAreaView,
  Animated,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { TabParamList } from '../navigation/TabNavigator';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllReports } from '../api/reports';

const { width } = Dimensions.get("window");

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'HomeTab'>,
  StackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

/**
 * BADGES CONFIG
 * imageKey is stored to AsyncStorage. Map it on ProfileScreen to the actual require() asset.
 * Update or add new entries as desired.
 */
const BADGES = [
  { id: 1, name: 'Green Starter', imageKey: 'badge1' },
  { id: 2, name: 'Eco Warrior', imageKey: 'badge2' },
  { id: 3, name: 'Planet Hero', imageKey: 'badge3' },
  { id: 4, name: 'Earth Guardian', imageKey: 'badge4' },
];

/**
 * Map imageKey to actual badge images
 */
const BADGE_IMAGE_MAP: Record<string, any> = {
  badge1: require('../assets/badge1.png'),
  badge2: require('../assets/badge2.png'),
  badge3: require('../assets/badge3.png'),
  badge4: require('../assets/badge4.png'),
};

const STORAGE_KEY_BADGE = 'currentBadge'; // JSON serialized {id,name,imageKey}
const STORAGE_KEY_CHALLENGES = 'completedChallenges'; // integer count of cycles completed (1 per 10)

const wasteTopics = [
  { title: 'Recycle Paper & Cardboard', content: 'Always flatten cardboard boxes, remove staples, and recycle clean paper products.', image: require('../assets/paper.png'), extra: 'Did you know? Recycling one ton of paper saves 17 trees and 7,000 gallons of water.' },
  { title: 'Sort Plastics Correctly', content: 'Check recycling symbols and separate plastics by type to ensure proper processing.', image: require('../assets/plastic.png'), extra: 'Plastic bottles can take up to 450 years to decompose in landfills!' },
  { title: 'Compost Your Organics', content: 'Food scraps, garden waste, and organic matter can be composted to reduce landfill waste.', image: require('../assets/compost.png'), extra: 'Composting reduces methane emissions and creates nutrient-rich soil.' },
  { title: 'Handle E-Waste Safely', content: 'Electronics should be recycled at certified e-waste facilities to prevent harmful chemicals from leaking.', image: require('../assets/ewaste.png'), extra: 'E-waste contains valuable metals like gold, silver, and copper that can be reused.' },
];

const tips = [
  { title: 'Use Reusable Bags', description: 'Reduce plastic waste by bringing your own reusable shopping bags.', image: require('../assets/bag.png') },
  { title: 'Avoid Single-Use Plastics', description: 'Choose products with minimal packaging and avoid disposable plastics.', image: require('../assets/no-plastic.png') },
  { title: 'Save Water', description: 'Turn off taps when not in use to conserve water resources.', image: require('../assets/water.png') },
  { title: 'Plant Trees', description: 'Trees help clean the air and provide habitat for wildlife.', image: require('../assets/tree.png') },
];

const newsItems = [
  { title: "Climate Change Commission: Latest News", description: "Updates from the Climate Change Commission of the Philippines.", url: "https://climate.gov.ph/news/923" },
  { title: "PNA: DENR pushes for solid waste management", description: "DENR urges LGUs to improve solid waste management practices.", url: "https://www.pna.gov.ph/articles/1241146" },
  { title: "PIDS Study: Adopt Circular Economy", description: "Research recommends circular economy for better solid waste management.", url: "https://www.pids.gov.ph/details/news/press-releases/pids-study-adopt-circular-economy-to-improve-solid-waste-management" },
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<typeof wasteTopics[0] | null>(null);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  // total number of resolved reports returned by backend
  const [totalResolvedReports, setTotalResolvedReports] = useState<number>(0);

  // how many 10-report cycles user has completed (persisted)
  const [completedChallenges, setCompletedChallenges] = useState<number>(0);

  // persisted current badge (serializable object)
  const [currentBadge, setCurrentBadge] = useState<{ id: number; name: string; imageKey: string } | null>(null);

  // celebration UI
  const [showCelebration, setShowCelebration] = useState(false);

  // refresh control
  const [refreshing, setRefreshing] = useState(false);

  // cycle config
  const totalGoal = 10;

  // cycle progress derived: number of reports into the current cycle (0..9)
  const cycleProgress = Math.max(0, totalResolvedReports - (completedChallenges * totalGoal));
  const progressRatio = totalGoal > 0 ? (cycleProgress / totalGoal) : 0;

  // animated progress value
  const animatedValue = new Animated.Value(progressRatio);

  // ---------- Storage helpers ----------
  const loadSavedBadgeAndChallenges = async () => {
    try {
      const rawBadge = await AsyncStorage.getItem(STORAGE_KEY_BADGE);
      if (rawBadge) setCurrentBadge(JSON.parse(rawBadge));
      // Don't load completedChallenges from storage anymore
      // We'll calculate it fresh based on totalResolvedReports
    } catch (err) {
      console.error('Error loading saved badge/challenges:', err);
    }
  };

  const saveBadgeAndChallenges = async (badgeObj: { id: number; name: string; imageKey: string } | null, challengesCount: number) => {
    try {
      if (badgeObj) {
        await AsyncStorage.setItem(STORAGE_KEY_BADGE, JSON.stringify(badgeObj));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_BADGE);
      }
      await AsyncStorage.setItem(STORAGE_KEY_CHALLENGES, challengesCount.toString());
    } catch (err) {
      console.error('Error saving badge/challenges:', err);
    }
  };

  // ---------- Fetch reports ----------
  const fetchReports = async () => {
    try {
      const reports = await getAllReports();
      // Get current user ID from token
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      // Decode JWT to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id;
      
      // Count only this user's resolved reports
      // Backend uses "Resolved" status, and reports array is returned directly
      const resolvedReports = (reports || []).filter((r: any) => 
        r.status === 'Resolved' && r.user && (r.user._id === userId || r.user === userId)
      ).length || 0;
      
      console.log('📊 User resolved reports count:', resolvedReports);
      setTotalResolvedReports(resolvedReports);
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const initializeScreen = async () => {
        await fetchReports();
        // Load badge AFTER fetching reports so we have the correct resolved count
        await loadSavedBadgeAndChallenges();
      };
      initializeScreen();
    }, [])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports();
    // Don't reload from storage on refresh - let useEffect handle badge updates
    setRefreshing(false);
  }, []);

  // animate progress when ratio changes
  useEffect(() => {
    Animated.timing(animatedValue, { toValue: progressRatio, duration: 600, useNativeDriver: false }).start();
  }, [progressRatio]);

  // ---------- detect milestone: when totalResolvedReports changes ----------
  useEffect(() => {
    // Calculate how many complete 10-report cycles the user has based on total resolved reports
    const calculatedCompleted = Math.floor(totalResolvedReports / totalGoal);
    
    // If user has 0 reports, clear the badge
    if (totalResolvedReports === 0) {
      if (currentBadge !== null) {
        setCurrentBadge(null);
        saveBadgeAndChallenges(null, 0);
      }
      if (completedChallenges !== 0) {
        setCompletedChallenges(0);
      }
      return;
    }
    
    // Check if user just completed a new milestone
    const justCompletedMilestone = (totalResolvedReports % totalGoal === 0) && totalResolvedReports > 0;
    
    // Update badge based on calculated completed challenges
    if (calculatedCompleted > 0) {
      const badgeIdx = Math.min(calculatedCompleted - 1, BADGES.length - 1);
      const badgeDef = BADGES[badgeIdx];
      const badgeObj = { id: badgeDef.id, name: badgeDef.name, imageKey: badgeDef.imageKey };
      
      // Only update if different from current
      if (!currentBadge || currentBadge.id !== badgeObj.id) {
        setCurrentBadge(badgeObj);
        saveBadgeAndChallenges(badgeObj, calculatedCompleted);
        
        // Show celebration when reaching a new milestone
        if (justCompletedMilestone && completedChallenges < calculatedCompleted) {
          setShowCelebration(true);
        }
      }
    }
    
    // Update completedChallenges to match calculation
    if (completedChallenges !== calculatedCompleted) {
      setCompletedChallenges(calculatedCompleted);
    }
  }, [totalResolvedReports]);

  // ---------- Handlers ----------
  const handleNewChallenge = () => {
    // Dismiss modal; cycle progress will be zero because completedChallenges was incremented and
    // cycleProgress is derived as totalResolvedReports - (completedChallenges * totalGoal)
    setShowCelebration(false);
  };

  const openTopicModal = (topic: typeof wasteTopics[0]) => {
    setSelectedTopic(topic);
    setModalVisible(true);
  };

  const closeTopicModal = () => {
    setSelectedTopic(null);
    setModalVisible(false);
  };

  const openNews = (url: string) => {
    Linking.openURL(url);
  };

  const renderTip = ({ item, index }: { item: typeof tips[0]; index: number }) => (
    <View style={[styles.tipCard, index === tips.length - 1 ? { marginRight: 0 } : { marginRight: 15 }]}>
      {item.image && <Image source={item.image} style={styles.tipImage} />}
      <Text style={styles.tipTitle}>{item.title}</Text>
      <Text style={styles.tipDescription}>{item.description}</Text>
    </View>
  );

  // progress bar width interpolation
  const progressBarWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#e8f5e9' }}>
      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2e7d32"
            colors={['#2e7d32']}
          />
        }
      >
        <Text style={styles.title}>Welcome To EcoCheck!</Text>
        <Text style={styles.subtitle}>You are successfully logged in.</Text>
        <Text style={styles.rewardInfo}>
          Report issues quickly and help keep your community safe, clean, and connected. Every report makes a difference.
        </Text>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => navigation.navigate('CreateReport')}
        >
          <Text style={styles.reportButtonText}>Create a New Report</Text>
        </TouchableOpacity>

        {/* 🌱 Recycling Challenge Tracker */}
        <View style={styles.trackerCard}>
          <Text style={styles.trackerTitle}>Recycling Challenge Progress</Text>

          <View style={styles.progressBarBackground}>
            <Animated.View style={[styles.progressBarFill, { width: progressBarWidth }]} />
          </View>

          <Text style={styles.trackerText}>
            {cycleProgress} of {totalGoal} reports completed
          </Text>
          <Text style={styles.trackerNote}>
            {cycleProgress >= totalGoal
              ? "Amazing! You've completed your challenge!"
              : "Keep going! Submit more reports to reach your goal"}
          </Text>
        </View>

        {/* Badge display */}
        <View style={{ width: '100%', marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Your Badge</Text>
            <TouchableOpacity 
              style={styles.viewBadgesButton}
              onPress={() => setBadgeModalVisible(true)}
            >
              <Text style={styles.viewBadgesButtonText}>View All Badges</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {currentBadge && totalResolvedReports >= 10 ? (
              <>
                {/* Display actual badge image */}
                <Image 
                  source={BADGE_IMAGE_MAP[currentBadge.imageKey] || require('../assets/badge1.png')}
                  style={{ width: 60, height: 60, marginRight: 12, resizeMode: 'contain' }}
                />
                <Text style={{ fontSize: 16, color: '#2e7d32', fontWeight: '600' }}>{currentBadge.name}</Text>
              </>
            ) : (
              <Text style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>
                Complete {totalGoal} resolved reports to earn your first badge!
              </Text>
            )}
          </View>
        </View>

        {/* Learn Section */}
        <Text style={styles.sectionTitle}>Learn About Recycling & Waste Segregation</Text>
        <View style={styles.cardsContainer}>
          {wasteTopics.map((topic, index) => (
            <TouchableOpacity
              key={index}
              style={styles.cardGrid}
              onPress={() => openTopicModal(topic)}
              activeOpacity={0.85}
            >
              {topic.image && <Image source={topic.image} style={styles.cardImage} />}
              <Text style={styles.cardTitle}>{topic.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Topic Modal */}
        <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={closeTopicModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedTopic?.title}</Text>
              {selectedTopic?.image && <Image source={selectedTopic.image} style={styles.modalImage} />}
              <ScrollView>
                <Text style={styles.modalText}>{selectedTopic?.content}</Text>
                <Text style={styles.modalExtra}>{selectedTopic?.extra}</Text>
              </ScrollView>
              <TouchableOpacity style={styles.closeButton} onPress={closeTopicModal}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Tips Carousel */}
        <Text style={styles.sectionTitle}>Eco-Friendly Tips</Text>
        <FlatList
          data={tips}
          renderItem={renderTip}
          keyExtractor={(_, idx) => idx.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={width * 0.8 + 15}
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={{
            paddingLeft: (width - width * 0.8) / 2 - 22,
            paddingRight: (width - width * 0.8) / 2,
          }}
        />

        {/* News Section */}
        <Text style={styles.sectionTitle}>Latest News</Text>
        <View style={styles.newsContainer}>
          {newsItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.newsCard}
              onPress={() => openNews(item.url)}
              activeOpacity={0.85}
            >
              <Text style={styles.newsTitle}>{item.title}</Text>
              <Text style={styles.newsDescription}>{item.description}</Text>
              <Text style={styles.newsLink}>Read More</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* � Badge Collection Modal */}
      <Modal visible={badgeModalVisible} transparent animationType="slide">
        <View style={styles.badgeModalOverlay}>
          <View style={styles.badgeModalContent}>
            <View style={styles.badgeModalHeader}>
              <Text style={styles.badgeModalTitle}>Badge Collection</Text>
              <TouchableOpacity onPress={() => setBadgeModalVisible(false)}>
                <Text style={styles.badgeModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.badgeModalScroll}>
              <View style={styles.badgeGrid}>
                {BADGES.map((badge, index) => {
                  const isUnlocked = completedChallenges >= (index + 1);
                  const reportsNeeded = (index + 1) * totalGoal;
                  
                  return (
                    <View key={badge.id} style={styles.badgeItem}>
                      <View style={[
                        styles.badgeImageContainer,
                        !isUnlocked && styles.lockedBadge
                      ]}>
                        <Image 
                          source={BADGE_IMAGE_MAP[badge.imageKey]}
                          style={[
                            styles.badgeCollectionImage,
                            !isUnlocked && styles.lockedBadgeImage
                          ]}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={[
                        styles.badgeName,
                        !isUnlocked && styles.lockedBadgeName
                      ]}>
                        {badge.name}
                      </Text>
                      <Text style={styles.badgeRequirement}>
                        {isUnlocked ? 'Unlocked' : `🔒 ${reportsNeeded} reports`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* �🎉 Celebration Popup */}
      <Modal visible={showCelebration} transparent animationType="fade">
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationBox}>
            <Text style={styles.celebrationEmoji}>🌿🎉</Text>
            <Text style={styles.celebrationTitle}>Challenge Completed!</Text>
            <Text style={styles.celebrationMessage}>
              Amazing work! You've completed { (completedChallenges) * totalGoal } reports and earned a new badge: { currentBadge?.name ?? '' }.
            </Text>
            <TouchableOpacity style={styles.celebrationButton} onPress={handleNewChallenge}>
              <Text style={styles.celebrationButtonText}>Start New Challenge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center', backgroundColor: '#e8f5e9', paddingTop: 10 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5, textAlign: 'center', color: '#2e7d32' },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 5, textAlign: 'center' },
  rewardInfo: { fontSize: 13, color: '#4caf50', marginBottom: 20, textAlign: 'center', fontStyle: 'italic' },
  reportButton: {
    backgroundColor: '#43a047',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  reportButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  trackerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 25,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  trackerTitle: { fontSize: 18, fontWeight: '600', color: '#2e7d32', marginBottom: 10, textAlign: 'center' },
  progressBarBackground: { height: 16, backgroundColor: '#c8e6c9', borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#43a047', borderRadius: 10 },
  trackerText: { textAlign: 'center', color: '#2e7d32', fontWeight: '600' },
  trackerNote: { textAlign: 'center', color: '#4caf50', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  sectionTitle: { fontSize: 22, fontWeight: '600', marginTop: 10, marginBottom: 15, alignSelf: 'flex-start', color: '#2e7d32' },
  cardsContainer: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  cardGrid: {
    backgroundColor: '#66bb6a',
    width: '48%',
    borderRadius: 16,
    marginBottom: 15,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    minHeight: 140,
  },
  cardImage: { width: '100%', height: 80, borderTopLeftRadius: 16, borderTopRightRadius: 16, resizeMode: 'cover', marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  modalText: { fontSize: 16, marginBottom: 15 },
  modalExtra: { fontSize: 14, fontStyle: 'italic', color: '#333', marginBottom: 20 },
  modalImage: { width: '100%', height: 200, resizeMode: 'contain', marginBottom: 15, borderRadius: 8, alignSelf: 'center' },
  closeButton: { backgroundColor: '#43a047', paddingVertical: 10, borderRadius: 5, alignItems: 'center', width: '100%', marginTop: 10 },
  closeButtonText: { color: '#fff', fontWeight: '500' },
  tipCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: width * 0.8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },
  tipImage: { width: '100%', height: 120, resizeMode: 'contain', marginBottom: 10 },
  tipTitle: { fontSize: 16, fontWeight: '600', color: '#2e7d32', marginBottom: 6, textAlign: 'center' },
  tipDescription: { fontSize: 14, color: '#555', textAlign: 'center' },
  newsContainer: { width: '100%', marginTop: 10, marginBottom: 30 },
  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 6,
    borderLeftColor: '#43a047',
  },
  newsTitle: { fontSize: 17, fontWeight: '600', color: '#2e7d32', marginBottom: 6 },
  newsDescription: { fontSize: 14, color: '#555', marginBottom: 8 },
  newsLink: { fontSize: 13, color: '#43a047', fontWeight: '500', textDecorationLine: 'underline' },

  // ✅ Celebration Popup Styles
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationBox: {
    backgroundColor: '#e8f5e9',
    padding: 25,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  celebrationEmoji: { fontSize: 48, marginBottom: 10 },
  celebrationTitle: { fontSize: 22, fontWeight: '700', color: '#2e7d32', marginBottom: 10, textAlign: 'center' },
  celebrationMessage: { fontSize: 15, color: '#4caf50', textAlign: 'center', marginBottom: 20 },
  celebrationButton: { backgroundColor: '#43a047', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  celebrationButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  // ✅ View All Badges Button
  viewBadgesButton: {
    backgroundColor: '#43a047',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  viewBadgesButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // ✅ Badge Collection Modal
  badgeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeModalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 10,
  },
  badgeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  badgeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2e7d32',
  },
  badgeModalClose: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666',
  },
  badgeModalScroll: {
    padding: 20,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  badgeImageContainer: {
    width: 80,
    height: 80,
    marginBottom: 12,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedBadge: {
    opacity: 0.3,
  },
  badgeCollectionImage: {
    width: 80,
    height: 80,
  },
  lockedBadgeImage: {
    width: 80,
    height: 80,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 32,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    textAlign: 'center',
    marginBottom: 4,
  },
  lockedBadgeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeRequirement: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;
