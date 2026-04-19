package com.ycyw.api.tchat.dto;

/** Tab badge counts for the agent inbox (new unassigned + my active). */
public record AgentInboxBucketCountsResponse(long newRequests, long myActive) {}
