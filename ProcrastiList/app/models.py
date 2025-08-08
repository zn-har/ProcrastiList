from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Todo(models.Model):
    PRIORITY_CHOICES = [
        ("HIGH", "High"),
        ("MEDIUM", "Medium"),
        ("LOW", "Low"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='todos')
    task = models.CharField(max_length=100)
    completed = models.BooleanField(default=False)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="LOW")

    def __str__(self):
        return f"{self.task} ({self.get_priority_display()})"
