import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import client from "../api/client";

const locations = ["Bulaon", "Del Carmen"];

const SignupScreen = () => {
  const navigation = useNavigation();
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [displayContactNumber, setDisplayContactNumber] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  const handleSignup = async () => {
    let newErrors: { [key: string]: string } = {};
    if (!firstName) newErrors.firstName = "First name is required";
    if (!lastName) newErrors.lastName = "Last name is required";
    if (!email) newErrors.email = "Email is required";
    if (!location) newErrors.location = "Location is required";
    if (!contactNumber) newErrors.contactNumber = "Contact number is required";
    if (contactNumber && contactNumber.length !== 10)
      newErrors.contactNumber = "Mobile number must be exactly 10 digits";
    if (!password) newErrors.password = "Password is required";
    if (!confirmPassword) newErrors.confirmPassword = "Confirm your password";
    if (password && confirmPassword && password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (!agreedToTerms) newErrors.agreedToTerms = "You must agree to the terms";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await client.post("/auth/register", {
        firstName,
        middleInitial,
        lastName,
        email,
        location,
        contactNumber: `0${contactNumber}`,
        password,
      });

      if (res.data.success && res.data.requiresVerification) {
        Alert.alert(
          "Check Your Email",
          "A verification code has been sent to your email. Please check your inbox.\n\n⚠️ Note: First-time emails may go to spam/junk folder.",
          [
            {
              text: "OK",
              onPress: () => (navigation as any).navigate("VerifyEmail", { email }),
            },
          ]
        );
      } else if (res.data.token) {
        Alert.alert("Success", "Account created successfully!");
        navigation.navigate("Login" as never);
      }
    } catch (err: any) {
      console.error("❌ Signup error:", err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => [styles.input, errors[field] ? { borderColor: "red" } : {}];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create an Account</Text>

      <TextInput
        style={inputStyle("firstName")}
        placeholder="First Name"
        placeholderTextColor="#555"
        value={firstName}
        onChangeText={setFirstName}
      />
      {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Middle Initial (optional)"
        placeholderTextColor="#555"
        value={middleInitial}
        onChangeText={setMiddleInitial}
        maxLength={1}
      />

      <TextInput
        style={inputStyle("lastName")}
        placeholder="Last Name"
        placeholderTextColor="#555"
        value={lastName}
        onChangeText={setLastName}
      />
      {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

      <TextInput
        style={inputStyle("email")}
        placeholder="Email"
        placeholderTextColor="#555"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      {/* Mobile Number */}
      <View style={styles.contactContainer}>
        <Text style={styles.countryCode}>+63</Text>
        <TextInput
          style={[inputStyle("contactNumber"), styles.contactInput]}
          placeholder="Mobile Number (e.g., 912 345 6789)"
          placeholderTextColor="#555"
          keyboardType="numeric"
          value={displayContactNumber}
          onChangeText={(text) => {
            const numericText = text.replace(/[^0-9]/g, "");
            if (numericText.length <= 10) {
              setContactNumber(numericText);
              let formatted = numericText;
              if (numericText.length > 3) formatted = numericText.slice(0, 3) + " " + numericText.slice(3);
              if (numericText.length > 6) formatted = numericText.slice(0, 3) + " " + numericText.slice(3, 6) + " " + numericText.slice(6);
              setDisplayContactNumber(formatted);
            }
          }}
          maxLength={12}
        />
      </View>
      {errors.contactNumber && <Text style={styles.errorText}>{errors.contactNumber}</Text>}

      {/* Location as small modal */}
      <TouchableOpacity
        style={[inputStyle("location"), styles.locationInput]}
        onPress={() => setLocationModalVisible(true)}
      >
        <Text style={{ color: location ? "#000" : "#999" }}>
          {location ? location : "Select Location"}
        </Text>
      </TouchableOpacity>
      {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}

      <Modal
        visible={locationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLocationModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <FlatList
                data={locations}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setLocation(item);
                      setLocationModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TextInput
        style={[inputStyle("password"), { color: '#000' }]}
        placeholder="Password"
        placeholderTextColor="#555"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      <TextInput
        style={[inputStyle("confirmPassword"), { color: '#000' }]}
        placeholder="Confirm Password"
        placeholderTextColor="#555"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

      {/* Terms and Conditions Checkbox */}
      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          {agreedToTerms && <View style={styles.checkboxChecked} />}
        </TouchableOpacity>
        <Text style={styles.checkboxLabel}>
          I've read and agreed to EcoCheck's{" "}
          <Text
            style={styles.linkTextInline}
            onPress={() => setTermsModalVisible(true)}
          >
            User Agreement and Privacy Policy
          </Text>
        </Text>
      </View>
      {errors.agreedToTerms && <Text style={styles.errorText}>{errors.agreedToTerms}</Text>}

      {/* Terms and Privacy Policy Modal */}
      <Modal
        visible={termsModalVisible}
        animationType="slide"
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.termsModalContainer}>
          <ScrollView style={styles.termsScrollView}>
            <Text style={styles.termsTitle}>User Agreement and Privacy Policy</Text>
            <Text style={styles.termsText}>
              Please read this Combined Legal Agreement ("Agreement") carefully. It governs your use of the EcoCheck mobile application (the "Service") operated by EcoCheck ("us", "we", or "our").{"\n\n"}
              Your access to and use of the Service is conditioned upon your acceptance of and compliance with this Agreement. By accessing or using the Service, you agree to be bound by these terms. If you disagree with any part of the terms, then you do not have permission to access the Service.{"\n\n"}
              <Text style={styles.termsSectionTitle}>1. Accounts</Text>{"\n\n"}
              When you create an account with us, you guarantee that you are above the age of 18 (or the age of majority in your jurisdiction) and that the information you provide us is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account on the Service.{"\n\n"}
              You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.{"\n\n"}
              You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.{"\n\n"}
              <Text style={styles.termsSectionTitle}>2. Intellectual Property</Text>{"\n\n"}
              The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of EcoCheck and its licensors. The Service is protected by copyright, trademark, and other laws of both the Philippines and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of EcoCheck.{"\n\n"}
              <Text style={styles.termsSectionTitle}>3. User Conduct</Text>{"\n\n"}
              You agree to use the Service only for lawful purposes. You are prohibited from using the Service to:{"\n\n"}
              • Violate any applicable national, state, local, or international law or regulation.{"\n\n"}
              • Transmit, or procure the sending of, any advertising or promotional material without our prior written consent, including any "junk mail," "chain letter," "spam," or any other similar solicitation.{"\n\n"}
              • Impersonate or attempt to impersonate EcoCheck, a EcoCheck employee, another user, or any other person or entity.{"\n\n"}
              • Engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service, or which, as determined by us, may harm EcoCheck or users of the Service or expose them to liability.{"\n\n"}
              <Text style={styles.termsSectionTitle}>4. Data Privacy, Processing, and Your Rights (Philippine DPA Compliance)</Text>{"\n\n"}
              We are committed to complying with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations.{"\n\n"}
              By using the Service, you acknowledge and agree that:{"\n\n"}
              • Collection and Processing: We may collect, use, process, store, and share your personal information for the purposes necessary to provide the Service.{"\n\n"}
              • Consent: You consent to the collection and processing of your personal information as outlined in the detailed clauses below.{"\n\n"}
              • Security: We shall implement reasonable and appropriate organizational, physical, and technical measures to protect your personal information against accidental or unlawful destruction, alteration, and disclosure.{"\n\n"}
              <Text style={styles.termsSectionTitle}>4.1. Detailed DPA Compliance Commitment</Text>{"\n\n"}
              We are committed to respecting and protecting the privacy of your personal data as a Data Subject. This section is designed to comply with the principles of Transparency, Legitimate Purpose, and Proportionality as set forth in the DPA.{"\n\n"}
              <Text style={styles.termsSectionTitle}>4.2. Information We Collect</Text>{"\n\n"}
              We collect several different types of information for various purposes to provide and improve our Service to you.{"\n\n"}
              <Text style={styles.termsSectionTitle}>4.2.A. Personal Data</Text>{"\n\n"}
              While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). This may include, but is not limited to:{"\n\n"}
              • Email address{"\n"}
              • First name and last name{"\n"}
              • Phone number{"\n"}
              • Location data (if authorized){"\n"}
              • User-generated content (e.g., photos, check-in data){"\n\n"}
              <Text style={styles.termsSectionTitle}>4.2.B. Usage Data</Text>{"\n\n"}
              We may also collect information that your browser sends whenever you visit our Service or when you access the Service by or through a mobile device ("Usage Data"). This Usage Data may include information such as your device's Internet Protocol address (e.g., IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers, and other diagnostic data.{"\n\n"}
              <Text style={styles.termsSectionTitle}>4.3. Legal Basis for Processing</Text>{"\n\n"}
              We process your Personal Data based on one or more of the following legal bases as required by the DPA:{"\n\n"}
              • Consent: You have given explicit consent to the processing of your personal data for one or more specific purposes.{"\n\n"}
              • Contract: Processing is necessary for the performance of a contract to which the data subject is a party (e.g., providing the Service you signed up for).{"\n\n"}
              • Legal Obligation: Processing is necessary for compliance with a legal obligation to which we are subject.{"\n\n"}
              <Text style={styles.termsSectionTitle}>4.4. Use of Data</Text>{"\n\n"}
              EcoCheck uses the collected data for various purposes:{"\n\n"}
              • To provide and maintain the Service.{"\n"}
              • To notify you about changes to our Service.{"\n"}
              • To allow you to participate in interactive features of our Service when you choose to do so.{"\n"}
              • To provide customer support.{"\n"}
              • To monitor the usage of the Service.{"\n"}
              • To detect, prevent, and address technical issues.{"\n"}
              • For statistical or research purposes related to environmental initiatives.{"\n\n"}
              <Text style={styles.termsSectionTitle}>4.5. Disclosure of Data</Text>{"\n\n"}
              We will not share or disclose your Personal Data to third parties except in the following circumstances:{"\n\n"}
              • With Service Providers: We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, or to perform Service-related services. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.{"\n\n"}
              • Legal Requirements: We may disclose your Personal Data in the good faith belief that such action is necessary to:{"\n"}
              - Comply with a legal obligation (e.g., search warrant or court order).{"\n"}
              - Protect and defend the rights or property of EcoCheck.{"\n"}
              - Prevent or investigate possible wrongdoing in connection with the Service.{"\n"}
              - Protect the personal safety of users of the Service or the public.{"\n\n"}
              <Text style={styles.termsSectionTitle}>4.6. Retention of Data</Text>{"\n\n"}
              We will retain your Personal Data only for as long as is necessary for the purposes set out in this Agreement. We will retain and use your Personal Data to the extent necessary to comply with our legal obligations (for example, if we are required to retain your data to comply with applicable laws), resolve disputes, and enforce our legal agreements and policies.{"\n\n"}
              <Text style={styles.termsSectionTitle}>4.7. Security of Data</Text>{"\n\n"}
              The security of your data is important to us. We implement reasonable and appropriate organizational, physical, and technical security measures to prevent unauthorized access, disclosure, alteration, or destruction of your Personal Data. However, no method of transmission over the Internet or method of electronic storage is 100% secure.{"\n\n"}
              <Text style={styles.termsSectionTitle}>4.8. Your Rights as a Data Subject (DPA Rights)</Text>{"\n\n"}
              Under the DPA, you have the following rights regarding your Personal Data:{"\n\n"}
              • The Right to be Informed: To be notified whether your personal data shall be, are being, or have been processed.{"\n\n"}
              • The Right to Access: To reasonable access to any of your personal data held by us.{"\n\n"}
              • The Right to Object: To suspend, withdraw, or order the blocking, removal, or destruction of your personal data under certain circumstances.{"\n\n"}
              • The Right to Erasure or Blocking: To withdraw your personal data, subject to legal limits.{"\n\n"}
              • The Right to Damages: To be indemnified for any damages sustained due to inaccurate, incomplete, outdated, falsely obtained, or unauthorized use of your personal data.{"\n\n"}
              • The Right to File a Complaint: To file a complaint with the National Privacy Commission (NPC) for violations of your rights.{"\n\n"}
              • The Right to Rectification: To dispute the inaccuracy or error in the personal data and have the data rectified immediately.{"\n\n"}
              To exercise any of these rights, please refer to our dedicated Contact Us or Data Subject Request page on our website for the appropriate contact details.{"\n\n"}
              <Text style={styles.termsSectionTitle}>5. Termination</Text>{"\n\n"}
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.{"\n\n"}
              If you wish to terminate your account, you may simply discontinue using the Service.{"\n\n"}
              All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.{"\n\n"}
              <Text style={styles.termsSectionTitle}>6. Indemnification</Text>{"\n\n"}
              You agree to defend, indemnify, and hold harmless EcoCheck and its licensee and licensors, and their employees, contractors, agents, officers, and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of a) your use and access of the Service, by you or any person using your account and password, or b) a breach of these Terms.{"\n\n"}
              <Text style={styles.termsSectionTitle}>7. Limitation Of Liability</Text>{"\n\n"}
              In no event shall EcoCheck, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage.{"\n\n"}
              <Text style={styles.termsSectionTitle}>8. Disclaimer</Text>{"\n\n"}
              Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.{"\n\n"}
              EcoCheck and its subsidiaries, affiliates, and licensors do not warrant that a) the Service will function uninterrupted, secure or available at any particular time or location; b) any errors or defects will be corrected; c) the Service is free of viruses or other harmful components; or d) the results of using the Service will meet your requirements.{"\n\n"}
              <Text style={styles.termsSectionTitle}>9. Governing Law</Text>{"\n\n"}
              These Terms shall be governed and construed in accordance with the laws of the Philippines, without regard to its conflict of law provisions.{"\n\n"}
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our Service and supersede and replace any prior agreements we might have had between us regarding the Service.{"\n\n"}
              <Text style={styles.termsSectionTitle}>10. Changes</Text>{"\n\n"}
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.{"\n\n"}
              By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setTermsModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login" as never)}>
        <Text style={styles.linkText}>Already have an account? Log In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 10, backgroundColor: "#fff" },
  contactContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  countryCode: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, backgroundColor: "#f5f5f5", marginRight: 8, fontSize: 16, fontWeight: "600", color: "#333" },
  contactInput: { flex: 1, marginBottom: 0 },
  locationInput: { justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  modalContainer: { backgroundColor: "#fff", borderRadius: 8, paddingVertical: 10, width: 250 },
  modalItem: { paddingVertical: 12, paddingHorizontal: 20 },
  modalItemText: { fontSize: 16 },
  errorText: { color: "red", marginBottom: 10, fontSize: 13 },
  button: { backgroundColor: "#4CAF50", padding: 15, borderRadius: 8, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  linkText: { marginTop: 15, color: "#4CAF50", textAlign: "center", fontWeight: "600" },
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 5 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: "#4CAF50", borderRadius: 4, marginRight: 10, justifyContent: "center", alignItems: "center" },
  checkboxChecked: { width: 12, height: 12, backgroundColor: "#4CAF50", borderRadius: 2 },
  checkboxLabel: { flex: 1, fontSize: 14, color: "#333" },
  linkTextInline: { color: "#4CAF50", fontWeight: "600", textDecorationLine: "underline" },
  termsModalContainer: { flex: 1, backgroundColor: "#fff", paddingTop: 50, paddingBottom: 20 },
  termsScrollView: { flex: 1, paddingHorizontal: 20 },
  termsTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center", color: "#333" },
  termsText: { fontSize: 14, lineHeight: 22, color: "#333" },
  termsSectionTitle: { fontWeight: "bold", fontSize: 15 },
  closeButton: { backgroundColor: "#4CAF50", padding: 15, marginHorizontal: 20, borderRadius: 8, alignItems: "center", marginTop: 10 },
  closeButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default SignupScreen;
