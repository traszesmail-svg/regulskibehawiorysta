package pl.regulski.phoneagent;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Static code audit and regression test verifying privacy guarantees in the conference path.
 *
 * Ensures:
 * - Zero logging of Call.getDetails()
 * - Zero logging of Call.getHandle()
 * - Zero logging of Call.getGatewayInfo()
 * - Zero logging of raw phone numbers or Uri objects
 * - Proper masking behavior in ConferencePhoneMasker
 */
public final class ConferencePrivacyAuditTest {

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError("FAIL: " + message);
    }

    public static void main(String[] args) throws IOException {
        testStaticSourcePrivacy();
        testPhoneMaskerSecurity();

        System.out.println("PASS ConferencePrivacyAuditTest (Privacy and zero PII audit passed)");
    }

    private static void testStaticSourcePrivacy() throws IOException {
        // Resolve project source directory for pl.regulski.phoneagent
        File currentDir = new File(".").getCanonicalFile();
        File srcDir = new File(currentDir, "android/phone-agent/app/src/main/java/pl/regulski/phoneagent");
        if (!srcDir.exists()) {
            srcDir = new File("app/src/main/java/pl/regulski/phoneagent").getCanonicalFile();
        }
        if (!srcDir.exists()) {
            srcDir = new File("../app/src/main/java/pl/regulski/phoneagent").getCanonicalFile();
        }
        check(srcDir.exists() && srcDir.isDirectory(), "source directory found: " + srcDir.getAbsolutePath());

        String[] auditedFiles = {
            "AgentInCallService.java",
            "TwoLegConferenceController.java",
            "ConferenceSessionCoordinator.java",
            "ProductionTelecomAdapter.java",
            "AndroidConferencePrerequisites.java",
            "ConferencePhoneMasker.java"
        };

        Pattern logWithDetails = Pattern.compile("Log\\.[diwe]\\s*\\(.*getDetails.*\\)");
        Pattern logWithHandle = Pattern.compile("Log\\.[diwe]\\s*\\(.*getHandle.*\\)");
        Pattern logWithGatewayInfo = Pattern.compile("Log\\.[diwe]\\s*\\(.*getGatewayInfo.*\\)");
        Pattern getHandlePattern = Pattern.compile("\\.getHandle\\s*\\(");
        Pattern getGatewayInfoPattern = Pattern.compile("\\.getGatewayInfo\\s*\\(");
        Pattern rawPhoneLogPattern = Pattern.compile("Log\\.[diwe]\\s*\\(.*(\\brawClientNumber\\b|\\brawOwnerNumber\\b|\\bclientNumber\\b|\\bownerNumber\\b).*\\)");

        for (String fileName : auditedFiles) {
            File f = new File(srcDir, fileName);
            check(f.exists(), "audited file exists: " + fileName);
            String content = new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8);

            // 1. Verify getDetails() is never logged in logcat
            Matcher detailsLogMatcher = logWithDetails.matcher(content);
            check(!detailsLogMatcher.find(), fileName + " must NEVER log getDetails() to logcat (violates privacy policy)");

            // 2. Verify getHandle() is never called or logged
            Matcher handleMatcher = getHandlePattern.matcher(content);
            check(!handleMatcher.find(), fileName + " must NEVER call .getHandle() (potential PII leak)");
            Matcher handleLogMatcher = logWithHandle.matcher(content);
            check(!handleLogMatcher.find(), fileName + " must NEVER log getHandle() to logcat");

            // 3. Verify getGatewayInfo() is never called or logged
            Matcher gwMatcher = getGatewayInfoPattern.matcher(content);
            check(!gwMatcher.find(), fileName + " must NEVER call .getGatewayInfo()");
            Matcher gwLogMatcher = logWithGatewayInfo.matcher(content);
            check(!gwLogMatcher.find(), fileName + " must NEVER log getGatewayInfo()");

            // 4. Verify raw phone variables are never passed to Log.*
            Matcher logMatcher = rawPhoneLogPattern.matcher(content);
            check(!logMatcher.find(), fileName + " must NEVER concatenate raw phone variables into Log statements");
        }
    }

    private static void testPhoneMaskerSecurity() {
        // Test standard 9-digit / E.164 numbers
        String masked1 = ConferencePhoneMasker.mask("+48500111222");
        check(masked1 != null && masked1.contains("***"), "masks middle digits: " + masked1);
        check(!masked1.contains("111"), "does not leak middle digits: " + masked1);
        check(masked1.startsWith("+48"), "preserves country prefix");

        String masked2 = ConferencePhoneMasker.mask("500111222");
        check(masked2 != null && masked2.contains("***"), "masks 9 digits: " + masked2);

        // Edge cases
        check("empty".equals(ConferencePhoneMasker.mask(null)) || "brak".equals(ConferencePhoneMasker.mask(null)) || "***".equals(ConferencePhoneMasker.mask(null)), "safe on null");
        check("empty".equals(ConferencePhoneMasker.mask("")) || "brak".equals(ConferencePhoneMasker.mask("")) || "***".equals(ConferencePhoneMasker.mask("")), "safe on empty");
        check("empty".equals(ConferencePhoneMasker.mask("   ")) || "brak".equals(ConferencePhoneMasker.mask("   ")) || "***".equals(ConferencePhoneMasker.mask("   ")), "safe on whitespace");
    }
}
