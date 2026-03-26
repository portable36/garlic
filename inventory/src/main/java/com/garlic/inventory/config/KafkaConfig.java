package com.garlic.inventory.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic stockCreatedTopic() {
        return TopicBuilder.name("stock.created").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic stockReservedTopic() {
        return TopicBuilder.name("stock.reserved").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic stockReleasedTopic() {
        return TopicBuilder.name("stock.released").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic stockDeductedTopic() {
        return TopicBuilder.name("stock.deducted").partitions(3).replicas(1).build();
    }
}
