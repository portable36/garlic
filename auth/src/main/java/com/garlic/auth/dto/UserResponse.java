package com.garlic.auth.dto;

import lombok.*;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Long id;

    private String email;

    private String username;

    private String firstName;

    private String lastName;

    private String fullName;

    private String phoneNumber;

    private Boolean enabled;

    private Set<String> roles;

    private String createdAt;
}
