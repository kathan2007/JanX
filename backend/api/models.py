from django.db import models
from django.contrib.auth.models import User

# --- Model 1: Development Request ---
class DevelopmentRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    ]
    
    # Kis resident/user ne request generate ki hai
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='development_requests', null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    state = models.CharField(max_length=100)  # Resident's mapped state/region code
    score = models.IntegerField(default=0)     # Upvotes/Popularity counter
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    image_url = models.URLField(max_length=500, blank=True, default='')  # CharField ki jagah URLField use karna safe hai
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.status})"


# --- Model 2: Grievance ---
class Grievance(models.Model):
    SECTOR_CHOICES = [
        ('WATER', 'Water Infrastructure & Supply'),
        ('ROAD', 'Road Damage & Public Transport'),
        ('HEALTH', 'Public Health & Medical Centers'),
        ('EDUCATION', 'Education, Literacy & Schools'),
        ('ELECTRICITY', 'Power Supply & Grid Management'),
        ('SANITATION', 'Public Sanitation & Cleanliness'),
        ('WASTE', 'Waste Management & Garbage Disposal'),
        ('SAFETY', 'Public Safety & Law Enforcement'),
        ('WOMEN_CHILD', 'Women & Child Development'),
        ('ENVIRONMENT', 'Environment, Parks & Pollution'),
        ('AGRICULTURE', 'Agriculture & Rural Development'),
    ]

    # Database values se emojis hata diye hain taaki filter/queries sahi chaley, labels me emoji rakhe hain
    STATUS_CHOICES = [
        ('PENDING', '⏳ Pending'),
        ('IN_PROGRESS', '⚙️ In Progress'),
        ('RESOLVED', '✅ Resolved'),
    ]

    citizen = models.ForeignKey(User, on_delete=models.CASCADE, related_name='grievances')
    title = models.CharField(max_length=255)  # Max length 255 kar di hai DevelopmentRequest se match karne ke liye
    description = models.TextField()
    
    # Dynamic Fields for Regional Routing
    sector = models.CharField(max_length=20, choices=SECTOR_CHOICES, default='WATER')
    state = models.CharField(max_length=100)  # Resident's mapped state code
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Grievance #{self.id} - {self.title} ({self.sector})"