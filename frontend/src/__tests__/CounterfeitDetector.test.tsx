import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import CounterfeitDetector from "../components/CounterfeitDetector";

describe("CounterfeitDetector Component", () => {
    it("renders authentic status when all 6 security checks pass", () => {
        render(
            <CounterfeitDetector
                batchId="BATCH-TEST-001"
                isGenuine={true}
                isRecalled={false}
                isExpired={false}
                anomalies={[]}
            />
        );

        expect(screen.getByText(/Counterfeit Medicine Security Verification Matrix/i)).toBeInTheDocument();
        expect(screen.getByText(/AUTHENTIC & VERIFIED/i)).toBeInTheDocument();
    });

    it("renders counterfeit alert when batch is recalled or anomalous", () => {
        render(
            <CounterfeitDetector
                batchId="BATCH-TEST-BAD"
                isGenuine={true}
                isRecalled={true}
                isExpired={true}
                anomalies={["Custody gap detected"]}
            />
        );

        expect(screen.getByText(/COUNTERFEIT THREAT/i)).toBeInTheDocument();
    });
});
